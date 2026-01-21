// app/api/checkout/route.ts (With booking reference generation)
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Discount from '@/lib/models/Discount';
import { EmailService } from '@/lib/email/emailService';
import Stripe from 'stripe';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { getTenantConfigCached } from '@/lib/tenant';
import { ITenant } from '@/lib/models/Tenant';
import { TenantEmailBranding } from '@/lib/email/type';

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

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const {
      customer,
      cart,
      pricing,
      paymentMethod = 'card',
      paymentDetails,
      userId,
      isGuest = false,
      discountCode = null,
      tenantId: requestTenantId // Optional: can be passed from frontend
    } = body;

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

    // Get tenantId from first cart item's tour (will be validated later when we fetch the tour)
    // This ensures all bookings are for the same tenant
    const firstTour = await Tour.findById(cart[0]._id || cart[0].id).select('tenantId').lean();
    const tenantId = firstTour?.tenantId || requestTenantId || 'default';
    
    // Get tenant configuration for tenant-specific settings
    const tenantConfig = await getTenantConfigCached(tenantId);
    const supportedPaymentMethods = tenantConfig?.payments?.supportedPaymentMethods;

    let user = null;

    // Handle user creation
    if (isGuest) {
      const existingUser = await User.findOne({ email: customer.email });
      
      if (existingUser) {
        user = existingUser;
      } else {
        try {
          user = await User.create({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
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
    } else if (userId) {
      user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unable to process user information' },
        { status: 400 }
      );
    }

    if (supportedPaymentMethods?.length && !supportedPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, message: 'Selected payment method is not available for this tenant.' },
        { status: 400 }
      );
    }

    // Process payment based on payment method
    let paymentResult;
    const isBankTransfer = paymentMethod === 'bank';
    const isPayLater = paymentMethod === 'pay_later';

    if (isBankTransfer) {
      // For bank transfer, no Stripe processing needed
      paymentResult = {
        paymentId: `BANK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'pending',
        amount: pricing.total,
        currency: (pricing.currency || 'USD').toUpperCase(),
      };
    } else if (isPayLater) {
      // For pay later, no payment processing needed
      paymentResult = {
        paymentId: `PAYLATER-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'pending',
        amount: pricing.total,
        currency: (pricing.currency || 'USD').toUpperCase(),
      };
    } else {
      // Process payment with Stripe for card payments
      try {
        // If paymentIntentId is provided, verify the payment
        if (paymentDetails?.paymentIntentId) {
          const stripe = getStripe();
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentDetails.paymentIntentId);

          if (paymentIntent.status !== 'succeeded') {
            throw new Error('Payment has not been completed. Please complete the payment and try again.');
          }

          // Verify the amount matches
          const expectedAmount = Math.round(pricing.total * 100);
          if (paymentIntent.amount !== expectedAmount) {
            throw new Error('Payment amount mismatch. Please contact support.');
          }

          paymentResult = {
            paymentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
          };
        } else {
          // Fallback: Create and auto-confirm PaymentIntent (for backward compatibility)
          const stripe = getStripe();
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(pricing.total * 100),
            currency: (pricing.currency || 'USD').toLowerCase(),
            description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''}`,
            metadata: {
              customer_email: customer.email,
              customer_name: `${customer.firstName} ${customer.lastName}`,
              tours: cart.map((item: any) => item.title).join(', '),
              discount_code: discountCode || 'none',
            },
            // receipt_email removed - we send our own booking confirmation email
            confirm: true,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'never',
            },
            payment_method: 'pm_card_visa', // Test only - won't work with live keys
          });

          if (paymentIntent.status !== 'succeeded') {
            throw new Error('Payment processing failed. Please try a different payment method.');
          }

          paymentResult = {
            paymentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
          };
        }
      } catch (stripeError: any) {
        console.error('Stripe payment error:', stripeError);
        throw new Error(stripeError.message || 'Payment processing failed. Please try again.');
      }
    }

    // Idempotency guard for Stripe payments to avoid duplicate bookings/emails
    if (!isBankTransfer && !isPayLater && paymentResult?.paymentId) {
      const existingBookings = await Booking.find({
        tenantId,
        paymentId: paymentResult.paymentId,
      }).lean();

      if (existingBookings.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Booking already processed for this payment.',
          bookingId: existingBookings[0].bookingReference,
          bookings: existingBookings.map(booking => booking._id),
          paymentId: paymentResult.paymentId,
          customer: {
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
          },
          duplicate: true,
        });
      }
    }

    // Increment discount usage counter if a discount was applied (tenant-specific)
    if (discountCode) {
      try {
        await Discount.findOneAndUpdate(
          { 
            code: discountCode.toUpperCase(),
            tenantId: tenantId // Filter by tenant to ensure discount belongs to this tenant
          },
          { $inc: { timesUsed: 1 } }
        );
      } catch (discountError) {
        console.error('Error updating discount usage:', discountError);
        // Don't fail the booking if discount update fails
      }
    }

    // Send Payment Confirmation or Bank Transfer Instructions or Pay Later Instructions
    try {
      if (isBankTransfer) {
        // Get tenant-specific bank details or use defaults
        const bankDetails = tenantConfig?.payments?.bankDetails || {
          bankName: 'Commercial International Bank (CIB)',
          accountName: tenantConfig?.name || 'Egypt Excursions Online',
          accountNumber: '1001234567890',
          iban: 'EG380001001001234567890',
          swiftCode: 'CIBEEGCX',
        };
        
        // Send bank transfer instructions email
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
        await EmailService.sendBankTransferInstructions({
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email,
          tourTitle: cart.length === 1 ? cart[0].title : `${cart.length} Tours`,
          bookingId: `BOOKING-${Date.now()}`,
          bookingDate: formatBookingDate(cart[0]?.selectedDate),
          bookingTime: cart[0]?.selectedTime || '10:00',
          participants: `${cart.reduce((sum: number, item: any) => sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0), 0)} participant(s)`,
          totalPrice: `${tenantConfig?.payments?.currencySymbol || '$'}${pricing.total.toFixed(2)}`,
          bankName: bankDetails.bankName,
          accountName: bankDetails.accountName,
          accountNumber: bankDetails.accountNumber,
          iban: bankDetails.iban,
          swiftCode: bankDetails.swiftCode,
          currency: paymentResult.currency,
          specialRequests: customer.specialRequests,
          hotelPickupDetails: customer.hotelPickupDetails,
          baseUrl,
          tenantBranding: getTenantEmailBranding(tenantConfig, baseUrl)
        });
      } else if (isPayLater) {
        // Pay later - no payment email needed, booking confirmation will be sent separately
        console.log('Pay Later booking - skipping payment confirmation email');
      } else {
        // Card payments: skip payment confirmation email to avoid duplicates
        console.log('Card payment - skipping payment confirmation email');
      }
    } catch (emailError) {
      console.error('Failed to send payment/bank transfer email:', emailError);
      // Don't fail the booking if email fails
    }

    // Create bookings with generated references
    const createdBookings = [];
    
    for (let i = 0; i < cart.length; i++) {
      const cartItem = cart[i];
      try {
        const tour = await Tour.findById(cartItem._id || cartItem.id);
        if (!tour) {
          throw new Error(`Tour not found: ${cartItem.title}`);
        }

        // Use parseLocalDate to ensure date-only strings are parsed correctly
        const bookingDate = parseLocalDate(cartItem.selectedDate) || new Date();
        // Store the original date string (YYYY-MM-DD) for timezone-safe display
        const bookingDateString = ensureDateOnlyString(cartItem.selectedDate);
        const bookingTime = cartItem.selectedTime || '10:00';
        const totalGuests = (cartItem.quantity || 1) + (cartItem.childQuantity || 0) + (cartItem.infantQuantity || 0);

        // Calculate the correct total price including add-ons and fees
        const calculateItemTotal = () => {
          const basePrice = cartItem.selectedBookingOption?.price || cartItem.discountPrice || cartItem.price || 0;
          const adultPrice = basePrice * (cartItem.quantity || 1);
          const childPrice = (basePrice / 2) * (cartItem.childQuantity || 0);
          let tourTotal = adultPrice + childPrice;

          let addOnsTotal = 0;
          if (cartItem.selectedAddOns && cartItem.selectedAddOnDetails) {
            Object.entries(cartItem.selectedAddOns).forEach(([addOnId, quantity]) => {
              const addOnDetail = cartItem.selectedAddOnDetails?.[addOnId];
              if (addOnDetail && Number(quantity) > 0) {
                const guestsForAddOns = (cartItem.quantity || 0) + (cartItem.childQuantity || 0);
                const addOnQuantity = addOnDetail.perGuest ? guestsForAddOns : 1;
                addOnsTotal += addOnDetail.price * addOnQuantity;
              }
            });
          }

          const subtotal = tourTotal + addOnsTotal;
          const serviceFee = subtotal * 0.03;
          const tax = subtotal * 0.05;

          return subtotal + serviceFee + tax;
        };

        const itemTotalPrice = calculateItemTotal();

        // Generate unique booking reference with tenant-specific prefix
        const bookingReference = await generateUniqueBookingReference(tenantId, tenantConfig);

        const booking = await Booking.create({
          tenantId: tour.tenantId || 'default', // Inherit tenant from tour
          bookingReference, // Provide the reference explicitly
          tour: tour._id,
          user: user._id,
          date: bookingDate,
          dateString: bookingDateString, // Store original YYYY-MM-DD for timezone-safe display
          time: bookingTime,
          guests: totalGuests,
          totalPrice: itemTotalPrice,
          status: (isBankTransfer || isPayLater) ? 'Pending' : 'Confirmed',
          paymentId: paymentResult.paymentId,
          paymentMethod,
          specialRequests: customer.specialRequests,
          emergencyContact: customer.emergencyContact,
          hotelPickupDetails: customer.hotelPickupDetails,
          hotelPickupLocation: customer.hotelPickupLocation,
          adultGuests: cartItem.quantity || 1,
          childGuests: cartItem.childQuantity || 0,
          infantGuests: cartItem.infantQuantity || 0,
          selectedAddOns: cartItem.selectedAddOns || {},
          selectedBookingOption: cartItem.selectedBookingOption,
          selectedAddOnDetails: cartItem.selectedAddOnDetails || {},
        });

        createdBookings.push(booking);
        
        // Add a small delay between bookings
        if (i < cart.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (bookingError: any) {
        console.error('Error creating booking:', bookingError);
        throw new Error(`Failed to create booking for ${cartItem.title}: ${bookingError.message}`);
      }
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
      const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
      const adultPrice = basePrice * (item.quantity || 1);
      const childPrice = (basePrice / 2) * (item.childQuantity || 0);
      let total = adultPrice + childPrice;

      if (item.selectedAddOns && item.selectedAddOnDetails) {
        Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
          const addOnDetail = item.selectedAddOnDetails?.[addOnId];
          if (addOnDetail && Number(quantity) > 0) {
            const guestsForAddOns = (item.quantity || 0) + (item.childQuantity || 0);
            const addOnQuantity = addOnDetail.perGuest ? guestsForAddOns : 1;
            total += addOnDetail.price * addOnQuantity;
          }
        });
      }

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
      if (adultCount > 0) {
        const basePrice = mainCartItem?.selectedBookingOption?.price || mainCartItem?.discountPrice || mainCartItem?.price || 0;
        participantParts.push(`${adultCount} x Adult${adultCount > 1 ? 's' : ''} ($${basePrice.toFixed(2)})`);
      }
      if (childCount > 0) {
        const basePrice = mainCartItem?.selectedBookingOption?.price || mainCartItem?.discountPrice || mainCartItem?.price || 0;
        const childPrice = basePrice / 2;
        participantParts.push(`${childCount} x Child${childCount > 1 ? 'ren' : ''} ($${childPrice.toFixed(2)})`);
      }
      if (infantCount > 0) {
        participantParts.push(`${infantCount} x Infant${infantCount > 1 ? 's' : ''} (Free)`);
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
    } catch (emailError) {
      console.error('Failed to send booking confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    // Send Admin Alert
    try {
      // Prepare detailed tour information
      const tourDetails = await Promise.all(cart.map(async (item: any) => {
        const tour = await Tour.findById(item._id || item.id);

        // Get add-ons details
        const addOns: string[] = [];
        if (item.selectedAddOns && item.selectedAddOnDetails) {
          Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
            const addOnDetail = item.selectedAddOnDetails?.[addOnId];
            const numericQuantity = Number(quantity);
            if (addOnDetail && numericQuantity > 0) {
              addOns.push(addOnDetail.title);
            }
          });
        }

        // Calculate item price
        const getItemTotal = (item: any) => {
          const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
          const adultPrice = basePrice * (item.quantity || 1);
          const childPrice = (basePrice / 2) * (item.childQuantity || 0);
          let tourTotal = adultPrice + childPrice;

          let addOnsTotal = 0;
          if (item.selectedAddOns && item.selectedAddOnDetails) {
            Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
              const addOnDetail = item.selectedAddOnDetails?.[addOnId];
              const numericQuantity = Number(quantity);
              if (addOnDetail && numericQuantity > 0) {
                const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
                const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
                addOnsTotal += addOnDetail.price * addOnQuantity;
              }
            });
          }

          return tourTotal + addOnsTotal;
        };

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
          price: formatMoney(getItemTotal(item))
        };
      }));

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

      await EmailService.sendAdminBookingAlert({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        tourTitle: cart.length === 1 ? mainTour?.title || 'Tour' : `${cart.length} Tours`,
        bookingId: bookingId,
        // Use original cart date to avoid timezone issues with MongoDB UTC storage
        bookingDate: emailBookingDate,
        totalPrice: formatMoney(pricing?.total),
        paymentMethod: paymentMethod,
        specialRequests: customer.specialRequests,
        hotelPickupDetails: customer.hotelPickupDetails,
        hotelPickupLocation,
        hotelPickupMapImage: hotelPickupMapImage || undefined,
        hotelPickupMapLink: hotelPickupMapLink || undefined,
        adminDashboardLink: baseUrl ? `${baseUrl}/admin/bookings/${bookingId}` : undefined,
        baseUrl,
        tours: tourDetails,
        timeUntil: timeUntilTour || undefined,
        dateBadge,
        tenantBranding: getTenantEmailBranding(tenantConfig, baseUrl),
        adminEmail: tenantConfig?.contact?.email // Use tenant admin email if available
      });
    } catch (emailError) {
      console.error('Failed to send admin alert email:', emailError);
      // Don't fail the booking if admin email fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking completed successfully!',
      bookingId: bookingId,
      bookings: createdBookings.map(booking => booking._id),
      paymentId: paymentResult.paymentId,
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