// app/api/checkout/route.ts (With booking reference generation)
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import { bookingPaymentFields, isDuplicateKeyError } from '@/lib/security/paymentEvidence';
import Tour from '@/lib/models/Tour';
import { effectiveUnitSize, isUnitPricedType, unitCount, type UnitCapacityOption } from '@/lib/bookings/unitPricing';
import { guestPricesFromBase } from '@/lib/revenue/guestPrices';
import { lineAddOnQuantity, lineTotal } from '@/lib/checkout/lineTotals';
import { unpackCartMetadata } from '@/lib/checkout/cartMetadata';
import { recoverPaidCartLine, type PaidCartSummaryItem } from '@/lib/checkout/recoveryPricing';
import { allocateChargedTotal } from '@/lib/bookings/storedLinePricing';
import User from '@/lib/models/user';
import Discount from '@/lib/models/Discount';
import { EmailService } from '@/lib/email/emailService';
import Stripe from 'stripe';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { getTenantConfigCached, getTenantFromRequest } from '@/lib/tenant';
import { ITenant } from '@/lib/models/Tenant';
import { TenantEmailBranding } from '@/lib/email/type';
import {
  calculateCheckoutPricing,
  CheckoutPriceChangedError,
  checkoutCustomerRef,
  checkoutFingerprint,
} from '@/lib/security/checkoutPricing';
import { signToken } from '@/lib/jwt';
import mongoose from 'mongoose';
import Availability from '@/lib/models/Availability';
import StopSale from '@/lib/models/StopSale';
import { assertStripePaymentAvailableForBooking } from '@/lib/security/stripePaymentState';
import {
  isCustomerPaymentMethod,
  resolveExecutablePaymentMethods,
} from '@/lib/payments/paymentProviderPolicy';

// Helper to convert tenant config to email branding
function getTenantEmailBranding(tenantConfig: ITenant | null, baseUrl: string): TenantEmailBranding | undefined {
  if (!tenantConfig) return undefined;
  
  return {
    tenantId: tenantConfig.tenantId,
    companyName: tenantConfig.name,
    logo: tenantConfig.branding?.logo,
    primaryColor: tenantConfig.branding?.primaryColor || '#E63946',
    secondaryColor: tenantConfig.branding?.secondaryColor || '#1D3557',
    accentColor: tenantConfig.branding?.accentColor || '#F4A261',
    contactEmail: tenantConfig.contact?.email || 'info@tours.com',
    contactPhone: tenantConfig.contact?.phone || '+20 000 000 0000',
    website: baseUrl || tenantConfig.domain,
    supportEmail: tenantConfig.contact?.supportEmail || tenantConfig.contact?.email,
    socialLinks: {
      facebook: tenantConfig.socialLinks?.facebook,
      instagram: tenantConfig.socialLinks?.instagram,
      twitter: tenantConfig.socialLinks?.twitter,
    },
    fromName: tenantConfig.email?.fromName || tenantConfig.name,
    fromEmail: tenantConfig.email?.fromEmail,
  };
}

// Lazy initialization to avoid build-time errors when env vars are missing
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return _stripe;
}

// Format date consistently for display
function formatBookingDate(dateString: string | Date | undefined): string {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper function to generate unique booking reference with tenant prefix
async function generateUniqueBookingReference(tenantId: string, tenantConfig?: ITenant | null): Promise<string> {
  const maxAttempts = 10;
  
  // Use tenant-specific prefix or derive from tenantId
  // Format: First letters of tenant name or tenantId abbreviation
  let prefix = 'BKG'; // Default fallback
  if (tenantConfig?.name) {
    // Create abbreviation from tenant name (e.g., "Egypt Excursions Online" -> "EEO")
    prefix = tenantConfig.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 4) || 'BKG';
  } else if (tenantId) {
    // Use first 3-4 chars of tenantId uppercase
    prefix = tenantId.replace(/-/g, '').slice(0, 4).toUpperCase() || 'BKG';
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `${prefix}-${timestamp}-${random}`;
    
    // Check if this reference already exists for this tenant
    const existing = await Booking.findOne({ tenantId, bookingReference: reference }).lean();
    
    if (!existing) {
      return reference;
    }
    
    // Add small delay before retry
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Fallback with extra randomness
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
}

const formatCurrencyValue = (value: number | undefined, symbol = '$'): string => {
  const numeric = Number.isFinite(value) ? Number(value) : 0;
  return `${symbol}${numeric.toFixed(2)}`;
};

const computeTimeUntilTour = (dateValue?: string | Date, timeValue?: string) => {
  const tourDate = parseLocalDate(dateValue);
  if (!tourDate) return null;

  if (timeValue) {
    const [hours, minutes] = timeValue.split(':').map(Number);
    if (!Number.isNaN(hours)) {
      tourDate.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
    }
  }

  const diff = tourDate.getTime() - Date.now();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
};

async function reserveAvailability(
  tenantId: string,
  tourId: string,
  dateText: string,
  time: string,
  optionId: string | undefined,
  guests: number,
  session: mongoose.ClientSession,
) {
  const start = new Date(`${dateText}T00:00:00.000Z`);
  const end = new Date(`${dateText}T23:59:59.999Z`);
  const stopped = await StopSale.exists({
    tenantId, tourId, startDate: { $lte: end }, endDate: { $gte: start },
    $or: [{ optionIds: { $size: 0 } }, ...(optionId ? [{ optionIds: optionId }] : [])],
  }).session(session);
  if (stopped) throw new Error('Selected tour is unavailable for this date');

  const availability: any = await Availability.findOne({
    tenantId, tour: tourId, date: { $gte: start, $lte: end },
  }).session(session);
  if (!availability) return;
  if (availability.stopSale) throw new Error('Selected tour is unavailable for this date');
  const slot = availability.slots.find((candidate: any) => candidate.time === time);
  if (!slot || slot.blocked) throw new Error('Selected time is unavailable');
  const remaining = Number(slot.capacity || 0) + Number(slot.extraCapacity || 0) - Number(slot.booked || 0);
  if (remaining < guests) throw new Error('Not enough availability for the selected participants');
  slot.booked = Number(slot.booked || 0) + guests;
  await availability.save({ session });
}

async function recoverSettledCheckout(
  metadata: Record<string, string>,
  tenantId: string,
  currency: string,
  amountMinor: number,
) {
  let summary: PaidCartSummaryItem[];
  try {
    const parsed = JSON.parse(unpackCartMetadata(metadata)) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 10) throw new Error('Invalid paid cart');
    summary = parsed as PaidCartSummaryItem[];
  } catch {
    throw new Error('Paid booking details are unavailable. Please contact support.');
  }
  const expectedCount = Number(metadata.tour_count);
  if (!Number.isInteger(expectedCount) || expectedCount !== summary.length) {
    throw new Error('Paid booking details do not match this payment.');
  }

  const cart = [];
  const lineSubtotals: number[] = [];
  for (const item of summary) {
    const tour = await Tour.findOne({
      _id: item.t,
      $or: [{ tenantId }, { tenantIds: tenantId }],
    }).select('_id title originalPrice').lean<{ _id: mongoose.Types.ObjectId; title: string; originalPrice?: number } | null>();
    if (!tour) throw new Error('A paid tour is no longer available to this website. Please contact support.');
    const recovered = recoverPaidCartLine(item, {
      id: String(tour._id),
      title: tour.title,
      originalPrice: tour.originalPrice,
    });
    cart.push(recovered.cartItem);
    lineSubtotals.push(recovered.lineSubtotal);
  }

  const subtotal = Number(lineSubtotals.reduce((sum, value) => sum + value, 0).toFixed(2));
  const serviceFee = Number((subtotal * 0.03).toFixed(2));
  const tax = Number((subtotal * 0.05).toFixed(2));
  const discount = Number(Number(metadata.pricing_discount || 0).toFixed(2));
  const total = Number((subtotal + serviceFee + tax - discount).toFixed(2));
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal + serviceFee + tax || total <= 0) {
    throw new Error('Paid pricing details are invalid. Please contact support.');
  }
  const recorded = {
    subtotal: Number(metadata.pricing_subtotal),
    serviceFee: Number(metadata.pricing_service_fee),
    tax: Number(metadata.pricing_tax),
    total: Number(metadata.pricing_total),
  };
  if (
    !Object.values(recorded).every(Number.isFinite)
    || Math.abs(recorded.subtotal - subtotal) > 0.001
    || Math.abs(recorded.serviceFee - serviceFee) > 0.001
    || Math.abs(recorded.tax - tax) > 0.001
    || Math.abs(recorded.total - total) > 0.001
    || Math.round(total * 100) !== amountMinor
    || String(metadata.pricing_currency || '').toUpperCase() !== currency.toUpperCase()
  ) throw new Error('Paid pricing details do not match this payment.');

  return { cart, pricing: { subtotal, serviceFee, tax, discount, total } };
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const {
      customer,
      cart: submittedCart,
      pricing: _submittedPricing,
      paymentMethod = 'card',
      paymentDetails,
      isGuest = false,
      discountCode = null,
    } = body;
    let cart = submittedCart;

    // Validation
    if (!customer || !cart || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking information' },
        { status: 400 }
      );
    }

    if (!customer.firstName || !customer.lastName || !customer.email) {
      return NextResponse.json(
        { success: false, message: 'Customer information is incomplete' },
        { status: 400 }
      );
    }

    // Resolve tenantId exclusively from the trusted request host/middleware.
    // The middleware sets x-tenant-id based on the domain the customer is browsing,
    // which is the correct tenant for the booking even when tours are shared.
    let tenantId = 'default';
    try {
      tenantId = await getTenantFromRequest();
    } catch {
      // Fallback if headers aren't available
    }
    
    // Get tenant configuration for tenant-specific settings
    const tenantConfig = await getTenantConfigCached(tenantId);
    const supportedPaymentMethods = resolveExecutablePaymentMethods(
      tenantConfig?.payments?.supportedPaymentMethods ?? ['card'],
    );
    if (!isCustomerPaymentMethod(paymentMethod) || paymentMethod !== 'card') {
      return NextResponse.json(
        { success: false, message: 'Selected payment method is not available for this tenant.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const paymentIntentId = typeof paymentDetails?.paymentIntentId === 'string'
      ? paymentDetails.paymentIntentId.trim()
      : '';
    if (!paymentIntentId) throw new Error('A verified payment intent is required.');
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
      assertStripePaymentAvailableForBooking(paymentIntent);
    } catch (stripeError: any) {
      console.error('Stripe payment verification error:', stripeError);
      throw new Error(stripeError.message || 'Payment verification failed. Please contact support.');
    }

    const paidMetadata = paymentIntent.metadata || {};
    const paidCurrency = String(paidMetadata.pricing_currency || paymentIntent.currency || '').toUpperCase();
    if (
      paidMetadata.has_booking_data !== 'true'
      || paidMetadata.tenant_id !== tenantId
      || paidMetadata.customer_ref !== checkoutCustomerRef(String(customer.email))
      || !/^[A-Z]{3}$/.test(paidCurrency)
      || paymentIntent.currency.toUpperCase() !== paidCurrency
    ) throw new Error('Payment does not match this checkout.');
    if (!supportedPaymentMethods.includes('card')) {
      // Provider policy is enforced before the intent is created. Once Stripe
      // has settled it, a later admin setting must not strand the paid order.
      console.warn('Finalizing a settled card payment after the tenant disabled new card checkouts.');
    }
    const metadataDiscount = paidMetadata.discount_code && paidMetadata.discount_code !== 'none'
      ? paidMetadata.discount_code.toUpperCase()
      : null;
    const appliedDiscountCode = metadataDiscount || (paidMetadata.discount_code ? null : discountCode);

    let validatedCheckout: Awaited<ReturnType<typeof calculateCheckoutPricing>>;
    try {
      validatedCheckout = await calculateCheckoutPricing(cart, tenantId, appliedDiscountCode);
    } catch (_pricingError) {
      // Stripe has already accepted this server-authored quote. Recover that
      // immutable snapshot when a later catalogue edit makes a fresh quote
      // impossible; live inventory is still rechecked in the transaction.
      validatedCheckout = await recoverSettledCheckout(
        paidMetadata,
        tenantId,
        paidCurrency,
        paymentIntent.amount,
      );
    }
    cart = validatedCheckout.cart;
    const pricing = {
      ...validatedCheckout.pricing,
      currency: paidCurrency,
      symbol: tenantConfig?.payments?.currencySymbol || '$',
    };
    if (
      paidMetadata.checkout_fingerprint !== checkoutFingerprint(cart, tenantId, paidCurrency)
      || paymentIntent.amount !== Math.round(pricing.total * 100)
    ) throw new Error('Payment does not match this checkout.');
    const paymentResult = {
      paymentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
    };

    let user = null;

    // Associate checkout by normalized email; never trust a client-supplied user id.
    {
      const normalizedCustomerEmail = String(customer.email).trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedCustomerEmail });
      
      if (existingUser) {
        user = existingUser;
      } else {
        try {
          user = await User.create({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: normalizedCustomerEmail,
            password: 'guest-' + Math.random().toString(36).substring(2, 15),
          });
          
          // Send Welcome Email for New Guest Users with real tours (filtered by tenant)
          try {
            // Fetch recommended tours from database (tenant-specific)
            const Tour = (await import('@/lib/models/Tour')).default;
            const recommendedTours = await Tour.find({ 
              tenantId: tenantId,
              isPublished: true 
            })
              .select('title slug images pricing')
              .limit(3)
              .lean();

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const currencySymbol = tenantConfig?.payments?.currencySymbol || '$';

            const tourRecommendations = recommendedTours.map((tour: any) => ({
              title: tour.title,
              image: tour.images?.[0]?.url || `${baseUrl}/pyramid.png`,
              price: tour.pricing?.adult ? `From ${currencySymbol}${tour.pricing.adult}` : `From ${currencySymbol}99`,
              link: `${baseUrl}/tour/${tour.slug}`
            }));

            // Fallback if no tours found
            if (tourRecommendations.length === 0) {
              tourRecommendations.push({
                title: "Browse All Tours",
                image: `${baseUrl}/pyramid.png`,
                price: "Explore",
                link: `${baseUrl}/tours`
              });
            }

            await EmailService.sendWelcomeEmail({
              customerName: `${customer.firstName} ${customer.lastName}`,
              customerEmail: customer.email,
              dashboardLink: `${baseUrl}/user/dashboard`,
              recommendedTours: tourRecommendations,
              baseUrl,
              tenantBranding: getTenantEmailBranding(tenantConfig, baseUrl)
            });
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail user creation if welcome email fails
          }
        } catch (userError: any) {
          if (userError.code === 11000) {
            user = await User.findOne({ email: customer.email });
          } else {
            throw userError;
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unable to process user information' },
        { status: 400 }
      );
    }

    // Idempotency guard for Stripe payments to avoid duplicate bookings/emails
    if (paymentResult?.paymentId) {
      const existingBookings = await Booking.find({
        tenantId,
        paymentId: paymentResult.paymentId,
      }).lean();

      if (existingBookings.length > 0) {
        const duplicateOrderId = existingBookings.length === 1
          ? existingBookings[0].bookingReference
          : `MULTI-${String(paymentResult.paymentId).replace(/[^a-zA-Z0-9_-]/g, '').slice(-40)}`;
        const receiptToken = await signToken({
          scope: 'receipt',
          tenantId,
          orderId: duplicateOrderId,
          bookingIds: existingBookings.map((booking) => String(booking._id)),
          pricing: {
            subtotal: pricing.subtotal,
            serviceFee: pricing.serviceFee,
            tax: pricing.tax,
            discount: pricing.discount,
            total: pricing.total,
            currency: pricing.currency,
            symbol: pricing.symbol,
          },
        }, { expiresIn: '24h' });
        return NextResponse.json({
          success: true,
          message: 'Booking already processed for this payment.',
          bookingId: duplicateOrderId,
          bookings: existingBookings.map(booking => booking._id),
          paymentId: paymentResult.paymentId,
          customer: {
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
          },
          duplicate: true,
          receiptToken,
        });
      }
    }

    // Create every item atomically. A paid multi-item order must never leave a
    // partial set of bookings if one item fails validation or persistence.
    const createdBookings = [];
    const lineSubtotals = cart.map((item: any) => lineTotal(item));
    const chargedLineTotals = allocateChargedTotal(lineSubtotals, pricing.total);
    const lineDiscounts = allocateChargedTotal(lineSubtotals, pricing.discount);
    const bookingSession = await mongoose.startSession();
    bookingSession.startTransaction();
    try {
    for (let i = 0; i < cart.length; i++) {
      const cartItem = cart[i];
      try {
        const tour = await Tour.findOne({
          _id: cartItem._id || cartItem.id,
          $or: [{ tenantId }, { tenantIds: tenantId }],
        }).session(bookingSession);
        if (!tour) {
          throw new Error(`Tour not found: ${cartItem.title}`);
        }

        // Use parseLocalDate to ensure date-only strings are parsed correctly
        const bookingDate = parseLocalDate(cartItem.selectedDate) || new Date();
        // Store the original date string (YYYY-MM-DD) for timezone-safe display
        const bookingDateString = ensureDateOnlyString(cartItem.selectedDate);
        const bookingTime = cartItem.selectedTime || '10:00';
        const totalGuests = (cartItem.quantity || 1) + (cartItem.childQuantity || 0) + (cartItem.infantQuantity || 0);
        await reserveAvailability(
          tenantId,
          String(tour._id),
          bookingDateString,
          bookingTime,
          cartItem.selectedBookingOption?.id,
          totalGuests,
          bookingSession,
        );

        // Allocate the amount Stripe actually charged across the order in
        // whole cents. The booking rows therefore sum exactly to the payment,
        // including order-level discount and rounding.
        const itemTotalPrice = chargedLineTotals[i];

        // Generate unique booking reference with tenant-specific prefix
        const bookingReference = await generateUniqueBookingReference(tenantId, tenantConfig);

        // Status and paid-ness follow the provider, never optimism: an
        // unsettled payment leaves the booking Pending with no evidence.
        const evidence = bookingPaymentFields(paymentResult, itemTotalPrice, { method: paymentMethod });
        const [booking] = await Booking.create([{
          tenantId, // Use the resolved tenant (from request domain, not tour)
          bookingReference, // Provide the reference explicitly
          tour: tour._id,
          user: user._id,
          date: bookingDate,
          dateString: bookingDateString, // Store original YYYY-MM-DD for timezone-safe display
          time: bookingTime,
          guests: totalGuests,
          totalPrice: itemTotalPrice,
          currency: String(pricing.currency || 'USD').toUpperCase(),
          status: evidence.status,
          paymentStatus: evidence.paymentStatus,
          amountPaid: evidence.amountPaid,
          paymentConfirmedAt: evidence.paymentConfirmedAt,
          paymentConfirmedBy: evidence.paymentConfirmedBy,
          paymentId: paymentResult.paymentId,
          paymentItemIndex: i,
          checkoutItemKey: `${tenantId}:${paymentResult.paymentId}:${i}`,
          paymentMethod,
          specialRequests: customer.specialRequests,
          emergencyContact: customer.emergencyContact,
          hotelPickupDetails: customer.hotelPickupDetails,
          hotelPickupLocation: customer.hotelPickupLocation,
          adultGuests: cartItem.quantity || 1,
          childGuests: cartItem.childQuantity || 0,
          infantGuests: cartItem.infantQuantity || 0,
          guestPrices: cartItem.guestPrices,
          selectedAddOns: cartItem.selectedAddOns || {},
          addOnQuantityVersion: cartItem.addOnQuantityVersion,
          selectedBookingOption: cartItem.selectedBookingOption,
          priceSnapshot: {
            guestPrices: cartItem.guestPrices,
            unitPricing: cartItem.unitPricing || undefined,
            version: Number(cartItem.priceVersion || 0),
            sourceVersion: cartItem.priceSourceVersion || undefined,
            executionId: cartItem.priceExecutionId || undefined,
            overrideId: cartItem.priceOverrideId || undefined,
            source: cartItem.priceOverrideId ? 'override' : 'catalogue',
            capturedAt: new Date(),
          },
          selectedAddOnDetails: cartItem.selectedAddOnDetails || {},
          discountCode: appliedDiscountCode || undefined,
          discountAmount: lineDiscounts[i] > 0 ? lineDiscounts[i] : undefined,
        }], { session: bookingSession });

        createdBookings.push(booking);
        
        // Add a small delay between bookings
        if (i < cart.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (bookingError: any) {
        // Another writer (the Stripe webhook, or a retried request) already
        // created this exact payment item. The unique index is the authority;
        // converge on the existing row instead of failing the customer.
        if (isDuplicateKeyError(bookingError)) {
          const existing = await Booking.findOne({
            tenantId,
            paymentId: paymentResult.paymentId,
            paymentItemIndex: i,
          }).session(bookingSession);
          if (existing) {
            createdBookings.push(existing);
            continue;
          }
        }
        console.error('Error creating booking:', bookingError);
        throw new Error(`Failed to create booking for ${cartItem.title}: ${bookingError.message}`);
      }
    }
    await bookingSession.commitTransaction();
    } catch (error) {
      await bookingSession.abortTransaction();
      throw error;
    } finally {
      await bookingSession.endSession();
    }

    // Count usage only after the order transaction commits. Failed/rolled-back
    // checkouts must not consume a limited discount.
    if (appliedDiscountCode) {
      await Discount.findOneAndUpdate(
        { code: String(appliedDiscountCode).toUpperCase(), tenantId },
        { $inc: { timesUsed: 1 } },
      );
    }

    // Generate booking confirmation data
    const mainBooking = createdBookings[0];
    const mainTour = await Tour.findById(mainBooking.tour);
    const bookingId = createdBookings.length === 1 ? mainBooking.bookingReference : `MULTI-${Date.now()}`;

    // IMPORTANT: Use the original cart date string for emails to avoid timezone issues
    // MongoDB stores dates in UTC which can cause off-by-one day errors when reformatted
    const mainCartItem = cart[0];
    const emailBookingDate = formatBookingDate(mainCartItem?.selectedDate);
    const emailBookingTime = mainCartItem?.selectedTime || mainBooking.time;
    const currencySymbol = pricing?.symbol || '$';
    const formatMoney = (value?: number) => formatCurrencyValue(value, currencySymbol);
    const orderedItemsSummary = cart.map((item: any) => {
      const total = lineTotal(item);

      return {
        title: item.title,
        image: item.image,
        adults: item.quantity || 0,
        children: item.childQuantity || 0,
        infants: item.infantQuantity || 0,
        bookingOption: item.selectedBookingOption?.title,
        totalPrice: formatMoney(total),
      };
    });

    const pricingDetails = pricing
      ? {
          subtotal: formatMoney(pricing.subtotal),
          serviceFee: formatMoney(pricing.serviceFee),
          tax: formatMoney(pricing.tax),
          discount: pricing.discount > 0 ? formatMoney(pricing.discount) : undefined,
          total: formatMoney(pricing.total),
          currencySymbol
        }
      : undefined;

    const hotelPickupLocation = customer.hotelPickupLocation || null;
    const hotelPickupMapImage = buildStaticMapImageUrl(hotelPickupLocation);
    const hotelPickupMapLink = buildGoogleMapsLink(hotelPickupLocation);
    const timeUntilTour = computeTimeUntilTour(mainCartItem?.selectedDate, emailBookingTime);
    const parsedDateForBadge = parseLocalDate(mainCartItem?.selectedDate) || new Date();
    const dateBadge = parsedDateForBadge
      ? {
          dayLabel: parsedDateForBadge.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
          dayNumber: parsedDateForBadge.getDate(),
          monthLabel: parsedDateForBadge.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
          year: parsedDateForBadge.getFullYear()
        }
      : undefined;
    
    // Send Enhanced Booking Confirmation
    try {
      // Get booking option from first cart item
      const bookingOption = mainCartItem?.selectedBookingOption?.title;

      // Calculate participant breakdown for first item
      const adultCount = mainCartItem?.quantity || 0;
      const childCount = mainCartItem?.childQuantity || 0;
      const infantCount = mainCartItem?.infantQuantity || 0;

      const participantParts = [];
      const mainOption = mainCartItem?.selectedBookingOption;
      const mainIsUnitPriced = Boolean(mainOption && isUnitPricedType(mainOption.type));
      if (mainIsUnitPriced && mainOption) {
        const units = unitCount(adultCount + childCount, effectiveUnitSize(mainOption as UnitCapacityOption));
        participantParts.push(`${units} x ${mainOption.title || mainOption.type} ($${Number(mainOption.price || 0).toFixed(2)}) for ${adultCount + childCount} guest${adultCount + childCount !== 1 ? 's' : ''}`);
      } else if (adultCount > 0) {
        const basePrice = mainCartItem?.selectedBookingOption?.price || mainCartItem?.discountPrice || mainCartItem?.price || 0;
        participantParts.push(`${adultCount} x Adult${adultCount > 1 ? 's' : ''} ($${basePrice.toFixed(2)})`);
      }
      const mainGuestPrices = guestPricesFromBase(
        mainCartItem?.selectedBookingOption?.price || mainCartItem?.discountPrice || mainCartItem?.price || 0,
        mainCartItem?.guestPrices,
      );
      if (!mainIsUnitPriced && childCount > 0) {
        participantParts.push(`${childCount} x Child${childCount > 1 ? 'ren' : ''} ($${mainGuestPrices.child.toFixed(2)})`);
      }
      if (infantCount > 0) {
        participantParts.push(mainIsUnitPriced || mainGuestPrices.infant <= 0
          ? `${infantCount} x Infant${infantCount > 1 ? 's' : ''} (Free)`
          : `${infantCount} x Infant${infantCount > 1 ? 's' : ''} ($${mainGuestPrices.infant.toFixed(2)})`);
      }

      const emailBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      await EmailService.sendBookingConfirmation({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        tourTitle: cart.length === 1 ? mainTour?.title || 'Tour' : `${cart.length} Tours`,
        // Use original cart date to avoid timezone issues with MongoDB UTC storage
        bookingDate: emailBookingDate,
        bookingTime: emailBookingTime,
        participants: `${mainBooking.guests} participant${mainBooking.guests !== 1 ? 's' : ''}`,
        participantBreakdown: participantParts.join(', '),
        totalPrice: formatMoney(pricing?.total),
        bookingId: bookingId,
        bookingOption: bookingOption,
        specialRequests: customer.specialRequests,
        hotelPickupDetails: customer.hotelPickupDetails,
        hotelPickupLocation,
        hotelPickupMapImage: hotelPickupMapImage || undefined,
        hotelPickupMapLink: hotelPickupMapLink || undefined,
        meetingPoint: mainTour?.meetingPoint || "Meeting point will be confirmed 24 hours before tour",
        contactNumber: tenantConfig?.contact?.phone || "+20 11 42255624",
        tourImage: mainTour?.image,
        baseUrl: emailBaseUrl,
        orderedItems: orderedItemsSummary,
        pricingDetails,
        timeUntil: timeUntilTour || undefined,
        customerPhone: customer.phone,
        dateBadge,
        tenantBranding: getTenantEmailBranding(tenantConfig, emailBaseUrl)
      });
      await Booking.updateMany(
        { _id: { $in: createdBookings.map((booking) => booking._id) } },
        { $set: { confirmationSentAt: new Date() }, $unset: { confirmationEmailFailedAt: 1, confirmationEmailFailureCode: 1 } },
      ).catch(() => undefined);
    } catch (emailError) {
      console.error('Failed to send booking confirmation email:', emailError);
      // Don't fail the booking if email fails — record it for the admin UI
      // ("nothing silent"); the resend button clears it.
      const failureCode = (emailError instanceof Error ? emailError.message : 'unknown_error').slice(0, 200);
      await Booking.updateMany(
        { _id: { $in: createdBookings.map((booking) => booking._id) } },
        { $set: { confirmationEmailFailedAt: new Date(), confirmationEmailFailureCode: failureCode } },
      ).catch(() => undefined);
    }

    // Send Admin Alert
    try {
      // Prepare detailed tour information
      const tourDetails = await Promise.all(cart.map(async (item: any) => {
        const tour = await Tour.findById(item._id || item.id);

        // Get add-ons details
        const addOns: string[] = [];
        if (item.selectedAddOns && item.selectedAddOnDetails) {
          Object.entries(item.selectedAddOns).forEach(([addOnId]) => {
            const addOnDetail = item.selectedAddOnDetails?.[addOnId];
            const units = lineAddOnQuantity(item, addOnId);
            if (addOnDetail && units > 0) {
              addOns.push(`${addOnDetail.title} ×${units}`);
            }
          });
        }

        // Calculate item price
        return {
          title: tour?.title || item.title,
          // Use parseLocalDate to ensure consistent date parsing
          date: (() => {
            const date = parseLocalDate(item.selectedDate);
            return date ? date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : '';
          })(),
          time: item.selectedTime || '10:00',
          adults: item.quantity || 0,
          children: item.childQuantity || 0,
          infants: item.infantQuantity || 0,
          bookingOption: item.selectedBookingOption?.title,
          addOns: addOns.length > 0 ? addOns : undefined,
          price: formatMoney(lineTotal(item))
        };
      }));

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

      console.log(`📧 [Checkout] Sending operator notification for booking ${bookingId}`);

      await EmailService.sendAdminBookingAlert({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerCountry: customer.country || undefined,
        tourTitle: cart.length === 1 ? mainTour?.title || 'Tour' : `${cart.length} Tours`,
        bookingId: bookingId,
        // Use original cart date to avoid timezone issues with MongoDB UTC storage
        bookingDate: emailBookingDate,
        bookingTime: cart[0]?.time || undefined,
        totalPrice: formatMoney(pricing?.total),
        paymentMethod: 'Card (Stripe)',
        paymentStatus: 'Paid',
        bookingSource: 'online',
        specialRequests: customer.specialRequests,
        hotelPickupDetails: customer.hotelPickupDetails,
        hotelPickupLocation,
        hotelPickupMapImage: hotelPickupMapImage || undefined,
        hotelPickupMapLink: hotelPickupMapLink || undefined,
        adminDashboardLink: `https://dashboard.egypt-excursionsonline.com/admin/bookings/${bookingId}`,
        baseUrl,
        tours: tourDetails,
        timeUntil: timeUntilTour || undefined,
        dateBadge,
        bookedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        tenantBranding: getTenantEmailBranding(tenantConfig, baseUrl),
        adminEmail: tenantConfig?.contact?.email,
      });
    } catch (emailError) {
      console.error(`❌ [Checkout] Failed to send operator notification email for booking ${bookingId}:`, emailError);
      // Don't fail the booking if admin email fails
    }

    // Return success response
    const receiptToken = await signToken({
      scope: 'receipt',
      tenantId,
      orderId: bookingId,
      bookingIds: createdBookings.map((booking) => String(booking._id)),
      pricing: {
        subtotal: pricing.subtotal,
        serviceFee: pricing.serviceFee,
        tax: pricing.tax,
        discount: pricing.discount,
        total: pricing.total,
        currency: pricing.currency,
        symbol: pricing.symbol,
      },
    }, { expiresIn: '24h' });

    return NextResponse.json({
      success: true,
      message: 'Booking completed successfully!',
      bookingId: bookingId,
      bookings: createdBookings.map(booking => booking._id),
      paymentId: paymentResult.paymentId,
      receiptToken,
      customer: {
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
      },
      ...(isGuest && { 
        guestAccount: true,
        message: 'Booking completed! A temporary account has been created with your email. You can set a password later to access your bookings.',
      }),
    });

  } catch (error: any) {
    console.error('Checkout error:', error);

    if (error instanceof CheckoutPriceChangedError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message, quote: error.quote },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    
    if (error.message.includes('Payment processing failed')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 402 }
      );
    }

    if (error.message.includes('Tour not found')) {
      return NextResponse.json(
        { success: false, message: 'One or more tours in your cart are no longer available' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Booking failed due to a server error. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// GET method for retrieving checkout session
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Session ID is required' },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        status: 'completed',
        payment_status: 'paid',
      },
    });

  } catch (error: any) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve checkout session' },
      { status: 500 }
    );
  }
}
