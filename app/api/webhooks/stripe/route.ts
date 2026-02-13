// app/api/webhooks/stripe/route.ts
// Multi-tenant Stripe webhook handler - adapted from EEO project
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Discount from '@/lib/models/Discount';
import { EmailService } from '@/lib/email/emailService';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { getTenantConfigCached } from '@/lib/tenant';
import { ITenant } from '@/lib/models/Tenant';
import { TenantEmailBranding } from '@/lib/email/type';

// Lazy Stripe initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-08-27.basil' as any,
    });
  }
  return stripeInstance;
}

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || '';

// Helper to convert tenant config to email branding
function getTenantEmailBrandingFromConfig(tenantConfig: ITenant | null, baseUrl: string): TenantEmailBranding | undefined {
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

// Helper to format currency
const formatCurrencyValue = (value: number | undefined, symbol = '$'): string => {
  const numeric = Number.isFinite(value) ? Number(value) : 0;
  return `${symbol}${numeric.toFixed(2)}`;
};

// Calculate time until tour
function computeTimeUntilTour(dateValue?: string | Date, timeValue?: string) {
  const tourDate = parseLocalDate(dateValue);
  if (!tourDate) return undefined;

  if (timeValue) {
    const [hours, minutes] = timeValue.split(':').map(Number);
    if (!Number.isNaN(hours)) {
      tourDate.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
    }
  }

  const diff = tourDate.getTime() - Date.now();
  if (diff <= 0) return undefined;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
  };
}

// Build date badge from a date
function buildDateBadge(dateValue?: string | Date): { dayLabel: string; dayNumber: number; monthLabel: string; year: number } | undefined {
  const d = parseLocalDate(dateValue);
  if (!d) return undefined;

  return {
    dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    dayNumber: d.getDate(),
    monthLabel: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    year: d.getFullYear(),
  };
}

// Generate unique booking reference with tenant prefix (same logic as checkout)
async function generateUniqueBookingReference(tenantId: string, tenantConfig?: ITenant | null): Promise<string> {
  const maxAttempts = 10;

  let prefix = 'BKG';
  if (tenantConfig?.name) {
    prefix = tenantConfig.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 4) || 'BKG';
  } else if (tenantId) {
    prefix = tenantId.replace(/-/g, '').slice(0, 4).toUpperCase() || 'BKG';
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `${prefix}-${timestamp}-${random}`;

    const existing = await Booking.findOne({ tenantId, bookingReference: reference }).lean();

    if (!existing) {
      return reference;
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
}

// ────────────────────────────────────────────────────────────────────────────
// PROCESS SUCCESSFUL PAYMENT
// ────────────────────────────────────────────────────────────────────────────
async function processSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.id;
  const metadata = paymentIntent.metadata;

  console.log(`[Webhook] Processing payment ${paymentId}`);
  console.log(`[Webhook] Metadata:`, JSON.stringify(metadata));

  // Check if booking data is available in metadata
  if (metadata.has_booking_data !== 'true') {
    console.log(`[Webhook] No booking data in metadata for ${paymentId}, skipping`);
    return { created: false, reason: 'no_booking_data' };
  }

  await dbConnect();

  // ── Resolve tenant ───────────────────────────────────────────────────────
  const tenantId = metadata.tenant_id || 'default';
  const tenantConfig = await getTenantConfigCached(tenantId);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const tenantBranding = getTenantEmailBrandingFromConfig(tenantConfig, baseUrl);
  const currencySymbol = tenantConfig?.payments?.currencySymbol || '$';
  const formatMoney = (value: number) => formatCurrencyValue(value, currencySymbol);
  const contactNumber = tenantConfig?.contact?.phone || '+20 000 000 0000';

  // ── Check if booking already exists (created by checkout endpoint) ───────
  const existingBookings = await Booking.find({ tenantId, paymentId });

  if (existingBookings.length > 0) {
    const firstBooking = existingBookings[0];
    console.log(`[Webhook] Booking(s) exist for payment ${paymentId}, status: ${firstBooking.status}`);

    // If booking is still "Pending", update to "Confirmed" and send customer email
    if (firstBooking.status === 'Pending') {
      console.log(`[Webhook] Updating ${existingBookings.length} booking(s) from Pending to Confirmed`);

      // Update all bookings for this payment to Confirmed
      for (const booking of existingBookings) {
        if (booking.status === 'Pending') {
          booking.status = 'Confirmed';
          await booking.save();
        }
      }

      // Send customer confirmation email for the confirmed booking(s)
      try {
        const mainBooking = existingBookings[0];
        const tour = await Tour.findById(mainBooking.tour);
        const user = await User.findById(mainBooking.user);

        if (tour && user) {
          const bookingDate = formatBookingDate(mainBooking.date);
          const hotelPickupLocation = mainBooking.hotelPickupLocation || null;
          const hotelPickupMapImage = hotelPickupLocation ? buildStaticMapImageUrl(hotelPickupLocation) : undefined;
          const hotelPickupMapLink = hotelPickupLocation ? buildGoogleMapsLink(hotelPickupLocation) : undefined;
          const dateBadge = buildDateBadge(mainBooking.date);
          const timeUntilTour = computeTimeUntilTour(mainBooking.date, mainBooking.time);

          // Build ordered items for email
          const orderedItems = await Promise.all(existingBookings.map(async (b: any) => {
            const t = await Tour.findById(b.tour);
            return {
              title: t?.title || 'Tour',
              image: t?.image,
              adults: b.adultGuests || 1,
              children: b.childGuests || 0,
              infants: b.infantGuests || 0,
              bookingOption: b.selectedBookingOption?.title,
              totalPrice: formatMoney(b.totalPrice || 0),
              quantity: b.adultGuests || 1,
              childQuantity: b.childGuests || 0,
              infantQuantity: b.infantGuests || 0,
              price: b.selectedBookingOption?.price || 0,
              selectedBookingOption: b.selectedBookingOption || undefined,
            };
          }));

          // Get pricing from metadata or approximate
          const pricingTotal = existingBookings.reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0);
          const pricingSubtotal = parseFloat(metadata.pricing_subtotal) || pricingTotal / 1.08;
          const pricingServiceFee = parseFloat(metadata.pricing_service_fee) || pricingSubtotal * 0.03;
          const pricingTax = parseFloat(metadata.pricing_tax) || pricingSubtotal * 0.05;
          const pricingDiscount = parseFloat(metadata.pricing_discount) || 0;

          const bookingId = existingBookings.length === 1
            ? mainBooking.bookingReference
            : `MULTI-${Date.now()}`;

          await EmailService.sendBookingConfirmation({
            customerName: `${user.firstName} ${user.lastName}`,
            customerEmail: user.email,
            customerPhone: metadata.customer_phone || '',
            tourTitle: existingBookings.length === 1
              ? tour.title || 'Tour'
              : `${existingBookings.length} Tours`,
            bookingDate,
            bookingTime: mainBooking.time,
            participants: `${mainBooking.guests} participant${mainBooking.guests !== 1 ? 's' : ''}`,
            totalPrice: formatMoney(pricingTotal),
            bookingId,
            bookingOption: mainBooking.selectedBookingOption?.title,
            meetingPoint: tour.meetingPoint || 'Meeting point will be confirmed 24 hours before tour',
            contactNumber,
            tourImage: tour.image,
            baseUrl,
            hotelPickupDetails: mainBooking.hotelPickupDetails || undefined,
            hotelPickupLocation: hotelPickupLocation || undefined,
            hotelPickupMapImage: hotelPickupMapImage || undefined,
            hotelPickupMapLink: hotelPickupMapLink || undefined,
            specialRequests: mainBooking.specialRequests || undefined,
            orderedItems,
            pricingDetails: {
              subtotal: formatMoney(pricingSubtotal),
              serviceFee: formatMoney(pricingServiceFee),
              tax: formatMoney(pricingTax),
              discount: pricingDiscount > 0 ? formatMoney(pricingDiscount) : undefined,
              total: formatMoney(pricingTotal),
              currencySymbol,
            },
            pricingRaw: {
              subtotal: pricingSubtotal,
              serviceFee: pricingServiceFee,
              tax: pricingTax,
              discount: pricingDiscount,
              total: pricingTotal,
              symbol: currencySymbol,
            },
            timeUntil: timeUntilTour,
            dateBadge,
            discountCode: mainBooking.discountCode || undefined,
            tenantBranding,
          });

          console.log(`[Webhook] Sent customer confirmation for updated booking(s) - tenant: ${tenantId}`);
        }
      } catch (emailError) {
        console.error(`[Webhook] Failed to send customer email for updated booking:`, emailError);
      }

      return {
        created: false,
        updated: true,
        reason: 'updated_to_confirmed',
        bookingId: firstBooking.bookingReference,
      };
    }

    // Booking exists and is already Confirmed
    console.log(`[Webhook] Booking ${firstBooking.bookingReference} already confirmed, skipping`);
    return { created: false, reason: 'already_confirmed', bookingId: firstBooking.bookingReference };
  }

  // ── FALLBACK: Create booking if it doesn't exist ─────────────────────────
  // This ensures no lost bookings even if the checkout endpoint failed
  console.log(`[Webhook] Creating booking for payment ${paymentId} (fallback - checkout didn't create it) - tenant: ${tenantId}`);

  // Extract customer info from metadata
  const customerEmail = metadata.customer_email;
  const customerFirstName = metadata.customer_first_name;
  const customerLastName = metadata.customer_last_name;
  const customerPhone = metadata.customer_phone || '';

  if (!customerEmail || !customerFirstName || !customerLastName) {
    console.error(`[Webhook] Missing customer data for payment ${paymentId}`);
    return { created: false, reason: 'missing_customer_data' };
  }

  // Extract hotel pickup info from metadata
  const hotelPickupDetails = metadata.hotel_pickup_details || '';
  let hotelPickupLocation: { lat: number; lng: number; name?: string; address?: string } | null = null;
  try {
    if (metadata.hotel_pickup_location) {
      hotelPickupLocation = JSON.parse(metadata.hotel_pickup_location);
    }
  } catch {
    console.log(`[Webhook] Could not parse hotel pickup location for ${paymentId}`);
  }

  // Extract special requests
  const specialRequests = metadata.special_requests || '';

  // Parse cart data from metadata
  let cartData;
  try {
    const cartJson = metadata.cart_data + (metadata.cart_data_2 || '');
    cartData = JSON.parse(cartJson);
  } catch (e) {
    console.error(`[Webhook] Failed to parse cart data for payment ${paymentId}:`, e);
    return { created: false, reason: 'invalid_cart_data' };
  }

  // Find or create user
  let user = await User.findOne({ email: customerEmail });
  if (!user) {
    try {
      user = await User.create({
        firstName: customerFirstName,
        lastName: customerLastName,
        email: customerEmail,
        password: 'guest-' + Math.random().toString(36).substring(2, 15),
      });
      console.log(`[Webhook] Created guest user ${customerEmail}`);
    } catch (userError: any) {
      if (userError.code === 11000) {
        user = await User.findOne({ email: customerEmail });
      } else {
        throw userError;
      }
    }
  }

  if (!user) {
    console.error(`[Webhook] Could not find or create user for ${customerEmail}`);
    return { created: false, reason: 'user_creation_failed' };
  }

  // Create bookings for each cart item
  const createdBookings = [];
  const pricingTotal = parseFloat(metadata.pricing_total) || (paymentIntent.amount / 100);

  for (let cartIndex = 0; cartIndex < cartData.length; cartIndex++) {
    const item = cartData[cartIndex];
    try {
      const tourId = item.t;
      const tour = await Tour.findById(tourId);

      if (!tour) {
        console.error(`[Webhook] Tour not found: ${tourId}`);
        continue;
      }

      // Use tour's tenantId to ensure correct tenant scoping
      const bookingTenantId = tour.tenantId || tenantId;

      const bookingDate = parseLocalDate(item.d) || new Date();
      const bookingDateString = ensureDateOnlyString(item.d);
      const bookingTime = item.tm || '10:00';
      const totalGuests = (item.a || 1) + (item.c || 0) + (item.n || 0);

      // Calculate price for this item
      const basePrice = item.bp || 0;
      const adultPrice = basePrice * (item.a || 1);
      const childPrice = (basePrice / 2) * (item.c || 0);
      let itemSubtotal = adultPrice + childPrice;

      // Add-ons from metadata
      const addOns = Array.isArray(item.ao) ? item.ao : [];
      if (addOns.length > 0) {
        const totalGuestsForAddOns = (item.a || 0) + (item.c || 0);
        for (const ao of addOns) {
          const qty = Number(ao?.q || 0);
          if (!Number.isFinite(qty) || qty <= 0) continue;
          const price = Number(ao?.p || 0);
          const perGuest = !!ao?.pg;
          const multiplier = perGuest ? totalGuestsForAddOns : 1;
          itemSubtotal += price * multiplier * qty;
        }
      }

      const itemSubtotalRounded = Math.round(itemSubtotal * 100) / 100;
      const serviceFee = itemSubtotalRounded * 0.03;
      const tax = itemSubtotalRounded * 0.05;
      const itemTotalBeforeDiscount = itemSubtotalRounded + serviceFee + tax;

      // Extract discount info
      const discountCode = metadata.discount_code && metadata.discount_code !== 'none'
        ? metadata.discount_code.toUpperCase()
        : undefined;
      const totalDiscount = parseFloat(metadata.pricing_discount) || 0;
      const pricingSubtotal = parseFloat(metadata.pricing_subtotal) || itemSubtotalRounded;

      // Prorate discount for multi-item carts
      const itemDiscountShare = cartData.length === 1
        ? totalDiscount
        : Math.round((itemSubtotalRounded / pricingSubtotal) * totalDiscount * 100) / 100;

      const itemTotalWithDiscount = Math.max(0, itemTotalBeforeDiscount - itemDiscountShare);

      // Generate unique booking reference (tenant-aware)
      const bookingReference = await generateUniqueBookingReference(bookingTenantId, tenantConfig);

      // Build add-on maps
      const selectedAddOns: Record<string, number> = {};
      const selectedAddOnDetails: Record<string, any> = {};
      if (Array.isArray(item.ao)) {
        for (const ao of item.ao) {
          if (!ao?.id) continue;
          const qty = Number(ao?.q || 0);
          if (!Number.isFinite(qty) || qty <= 0) continue;
          selectedAddOns[ao.id] = qty;
          selectedAddOnDetails[ao.id] = {
            id: ao.id,
            title: ao.t || 'Add-on',
            price: Number(ao.p || 0),
            category: 'add-on',
            perGuest: !!ao.pg,
          };
        }
      }

      const booking = await Booking.create({
        tenantId: bookingTenantId,
        bookingReference,
        tour: tour._id,
        user: user._id,
        date: bookingDate,
        dateString: bookingDateString,
        time: bookingTime,
        guests: totalGuests,
        totalPrice: itemTotalWithDiscount,
        currency: (metadata.pricing_currency || paymentIntent.currency || 'USD').toUpperCase(),
        status: 'Confirmed',
        paymentId: paymentId,
        paymentMethod: 'card',
        adultGuests: item.a || 1,
        childGuests: item.c || 0,
        infantGuests: item.n || 0,
        selectedAddOns: Object.keys(selectedAddOns).length > 0 ? selectedAddOns : undefined,
        selectedAddOnDetails: Object.keys(selectedAddOnDetails).length > 0 ? selectedAddOnDetails : undefined,
        selectedBookingOption: item.bo ? {
          id: item.bo,
          title: item.bot || '',
          price: item.bp || 0,
        } : undefined,
        discountCode,
        discountAmount: itemDiscountShare > 0 ? itemDiscountShare : undefined,
        hotelPickupDetails: hotelPickupDetails || undefined,
        hotelPickupLocation: hotelPickupLocation || undefined,
        specialRequests: specialRequests || undefined,
      });

      createdBookings.push({ booking, tour });
      console.log(`[Webhook] Created booking ${bookingReference} for tour ${tour.title} - tenant: ${bookingTenantId}`);
    } catch (bookingError: any) {
      // E11000 = duplicate key error - booking already exists
      if (
        bookingError.code === 11000 &&
        (bookingError.keyPattern?.bookingReference || bookingError.keyPattern?.paymentId)
      ) {
        console.log(`[Webhook] Duplicate booking for payment ${paymentId} - skipping`);

        const existingBooking = await Booking.findOne({ tenantId, paymentId });
        if (existingBooking) {
          const existingTour = await Tour.findById(existingBooking.tour);
          if (existingTour) {
            createdBookings.push({ booking: existingBooking, tour: existingTour });
          }
        } else {
          const fallback = await Booking.findOne({ paymentId }).lean();
          if (fallback) {
            return {
              created: false,
              reason: 'already_exists_concurrent',
              bookingId: fallback.bookingReference,
            };
          }
        }
      } else {
        console.error(`[Webhook] Error creating booking:`, bookingError);
      }
    }
  }

  if (createdBookings.length === 0) {
    console.error(`[Webhook] No bookings created for payment ${paymentId}`);
    return { created: false, reason: 'no_bookings_created' };
  }

  // ── Send confirmation & admin emails ─────────────────────────────────────
  try {
    const mainBooking = createdBookings[0];
    const bookingId = createdBookings.length === 1
      ? mainBooking.booking.bookingReference
      : `MULTI-${Date.now()}`;

    const emailBookingDate = formatBookingDate(mainBooking.booking.date);
    const hotelPickupMapImage = hotelPickupLocation ? buildStaticMapImageUrl(hotelPickupLocation) : undefined;
    const hotelPickupMapLink = hotelPickupLocation ? buildGoogleMapsLink(hotelPickupLocation) : undefined;

    // Pricing from metadata
    const pricingSubtotal = parseFloat(metadata.pricing_subtotal) || pricingTotal;
    const pricingServiceFee = parseFloat(metadata.pricing_service_fee) || 0;
    const pricingTax = parseFloat(metadata.pricing_tax) || 0;
    const pricingDiscount = parseFloat(metadata.pricing_discount) || 0;

    const timeUntilTour = computeTimeUntilTour(mainBooking.booking.date, mainBooking.booking.time);
    const dateBadge = buildDateBadge(mainBooking.booking.date);

    // Build ordered items array
    const orderedItems = createdBookings.map((item: any) => ({
      title: item.tour?.title || 'Tour',
      image: item.tour?.image,
      adults: item.booking.adultGuests || 1,
      children: item.booking.childGuests || 0,
      infants: item.booking.infantGuests || 0,
      bookingOption: item.booking.selectedBookingOption?.title,
      totalPrice: formatMoney(item.booking.totalPrice || 0),
      quantity: item.booking.adultGuests || 1,
      childQuantity: item.booking.childGuests || 0,
      infantQuantity: item.booking.infantGuests || 0,
      price: item.booking.selectedBookingOption?.price || 0,
      selectedBookingOption: item.booking.selectedBookingOption || undefined,
    }));

    // ── Customer confirmation email ─────────────────────────────────────────
    await EmailService.sendBookingConfirmation({
      customerName: `${customerFirstName} ${customerLastName}`,
      customerEmail,
      customerPhone,
      tourTitle: createdBookings.length === 1
        ? mainBooking.tour?.title || 'Tour'
        : `${createdBookings.length} Tours`,
      bookingDate: emailBookingDate,
      bookingTime: mainBooking.booking.time,
      participants: `${mainBooking.booking.guests} participant${mainBooking.booking.guests !== 1 ? 's' : ''}`,
      totalPrice: formatMoney(pricingTotal),
      bookingId,
      bookingOption: mainBooking.booking.selectedBookingOption?.title,
      meetingPoint: mainBooking.tour?.meetingPoint || 'Meeting point will be confirmed 24 hours before tour',
      contactNumber,
      tourImage: mainBooking.tour?.image,
      baseUrl,
      hotelPickupDetails: hotelPickupDetails || undefined,
      hotelPickupLocation: hotelPickupLocation || undefined,
      hotelPickupMapImage: hotelPickupMapImage || undefined,
      hotelPickupMapLink: hotelPickupMapLink || undefined,
      specialRequests: specialRequests || undefined,
      orderedItems,
      pricingDetails: {
        subtotal: formatMoney(pricingSubtotal),
        serviceFee: formatMoney(pricingServiceFee),
        tax: formatMoney(pricingTax),
        discount: pricingDiscount > 0 ? formatMoney(pricingDiscount) : undefined,
        total: formatMoney(pricingTotal),
        currencySymbol,
      },
      pricingRaw: {
        subtotal: pricingSubtotal,
        serviceFee: pricingServiceFee,
        tax: pricingTax,
        discount: pricingDiscount,
        total: pricingTotal,
        symbol: currencySymbol,
      },
      timeUntil: timeUntilTour,
      dateBadge,
      discountCode: metadata.discount_code && metadata.discount_code !== 'none'
        ? metadata.discount_code.toUpperCase()
        : undefined,
      tenantBranding,
    });

    console.log(`[Webhook] Sent booking confirmation to ${customerEmail} - tenant: ${tenantId}`);

    // ── Admin alert email ───────────────────────────────────────────────────
    const tourDetails = await Promise.all(createdBookings.map(async (item: any) => {
      const addOns: string[] = [];
      if (item.booking.selectedAddOnDetails) {
        const details = item.booking.selectedAddOnDetails;
        const entries = details instanceof Map ? Array.from(details.entries()) : Object.entries(details || {});
        for (const [_id, detail] of entries) {
          if (detail && (detail as any).title) {
            addOns.push((detail as any).title);
          }
        }
      }

      return {
        title: item.tour?.title || 'Tour',
        date: formatBookingDate(item.booking.date),
        time: item.booking.time,
        adults: item.booking.adultGuests || 1,
        children: item.booking.childGuests || 0,
        infants: item.booking.infantGuests || 0,
        bookingOption: item.booking.selectedBookingOption?.title,
        addOns: addOns.length > 0 ? addOns : undefined,
        price: formatMoney(item.booking.totalPrice || 0),
      };
    }));

    const adminEmail = tenantConfig?.contact?.email || process.env.ADMIN_NOTIFICATION_EMAIL;

    await EmailService.sendAdminBookingAlert({
      customerName: `${customerFirstName} ${customerLastName}`,
      customerEmail,
      customerPhone,
      tourTitle: createdBookings.length === 1
        ? mainBooking.tour?.title || 'Tour'
        : `${createdBookings.length} Tours`,
      bookingId,
      bookingDate: emailBookingDate,
      totalPrice: formatMoney(pricingTotal),
      paymentMethod: 'card',
      baseUrl,
      adminDashboardLink: baseUrl ? `${baseUrl}/admin/bookings/${bookingId}` : undefined,
      hotelPickupDetails: hotelPickupDetails || undefined,
      hotelPickupLocation: hotelPickupLocation || undefined,
      hotelPickupMapImage: hotelPickupMapImage || undefined,
      hotelPickupMapLink: hotelPickupMapLink || undefined,
      specialRequests: specialRequests || undefined,
      tours: tourDetails,
      timeUntil: timeUntilTour,
      dateBadge,
      tenantBranding,
      adminEmail,
    });

    console.log(`[Webhook] Sent admin alert for booking ${bookingId} to ${adminEmail || 'default'} - tenant: ${tenantId}`);
  } catch (emailError) {
    console.error(`[Webhook] Failed to send emails:`, emailError);
    // Don't fail the whole process if email fails
  }

  return {
    created: true,
    count: createdBookings.length,
    bookingIds: createdBookings.map(b => b.booking.bookingReference),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN WEBHOOK HANDLER
// ────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        getWebhookSecret()
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] PaymentIntent succeeded: ${paymentIntent.id}`);

        // CRITICAL: Create booking if it doesn't exist yet
        // This ensures bookings are created even if the frontend callback fails
        try {
          const result = await processSuccessfulPayment(paymentIntent);
          console.log(`[Webhook] Process result for ${paymentIntent.id}:`, result);
        } catch (processError: any) {
          console.error(`[Webhook] Failed to process payment ${paymentIntent.id}:`, processError);
          // Still return 200 to acknowledge the webhook, but log the error
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Payment failed: ${failedPayment.id}`);
        // Log failed payment for monitoring
        break;

      case 'charge.succeeded':
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge succeeded: ${charge.id}`);
        break;

      case 'charge.refunded':
        const refund = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge refunded: ${refund.id}`);
        // TODO: Update booking status to refunded
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
