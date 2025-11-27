// app/api/checkout/route.ts (With booking reference generation)
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Discount from '@/lib/models/Discount';
import { EmailService } from '@/lib/email/emailService';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Helper to parse date-only strings as local dates (not UTC)
// This fixes timezone issues where "2024-11-27" would be interpreted as UTC midnight
// and then shown as the previous day in timezones behind UTC
function parseLocalDate(dateString: string | Date | undefined): Date | null {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;

  // If it's a date-only string (YYYY-MM-DD), parse as local date
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }

  // Otherwise parse normally (handles ISO strings with time component)
  return new Date(dateString);
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

// Helper function to generate unique booking reference
async function generateUniqueBookingReference(): Promise<string> {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prefix = 'EEO';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `${prefix}-${timestamp}-${random}`;
    
    // Check if this reference already exists
    const existing = await Booking.findOne({ bookingReference: reference }).lean();
    
    if (!existing) {
      return reference;
    }
    
    // Add small delay before retry
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Fallback with extra randomness
  return `EEO-${Date.now()}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
}

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
      discountCode = null
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
          
          // Send Welcome Email for New Guest Users with real tours
          try {
            // Fetch recommended tours from database
            const Tour = (await import('@/lib/models/Tour')).default;
            const recommendedTours = await Tour.find({})
              .select('title slug images pricing')
              .limit(3)
              .lean();

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            const tourRecommendations = recommendedTours.map((tour: any) => ({
              title: tour.title,
              image: tour.images?.[0]?.url || `${baseUrl}/pyramid.png`,
              price: tour.pricing?.adult ? `From $${tour.pricing.adult}` : 'From $99',
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
              baseUrl
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

    // Process payment based on payment method
    let paymentResult;
    const isBankTransfer = paymentMethod === 'bank';

    if (isBankTransfer) {
      // For bank transfer, no Stripe processing needed
      paymentResult = {
        paymentId: `BANK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'pending',
        amount: pricing.total,
        currency: (pricing.currency || 'USD').toUpperCase(),
      };
    } else {
      // Process payment with Stripe for card payments
      try {
        // If paymentIntentId is provided, verify the payment
        if (paymentDetails?.paymentIntentId) {
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
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(pricing.total * 100),
            currency: (pricing.currency || 'USD').toLowerCase(),
            description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''}`,
            metadata: {
              customer_email: customer.email,
              customer_name: `${customer.firstName} ${customer.lastName}`,
              tours: cart.map(item => item.title).join(', '),
              discount_code: discountCode || 'none',
            },
            receipt_email: customer.email,
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

    // Increment discount usage counter if a discount was applied
    if (discountCode) {
      try {
        await Discount.findOneAndUpdate(
          { code: discountCode.toUpperCase() },
          { $inc: { timesUsed: 1 } }
        );
      } catch (discountError) {
        console.error('Error updating discount usage:', discountError);
        // Don't fail the booking if discount update fails
      }
    }

    // Send Payment Confirmation or Bank Transfer Instructions
    try {
      if (isBankTransfer) {
        // Send bank transfer instructions email
        await EmailService.sendBankTransferInstructions({
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email,
          tourTitle: cart.length === 1 ? cart[0].title : `${cart.length} Tours`,
          bookingId: `BOOKING-${Date.now()}`,
          bookingDate: formatBookingDate(cart[0]?.selectedDate),
          bookingTime: cart[0]?.selectedTime || '10:00',
          participants: `${cart.reduce((sum: number, item: any) => sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0), 0)} participant(s)`,
          totalPrice: `$${pricing.total.toFixed(2)}`,
          bankName: 'Commercial International Bank (CIB)',
          accountName: 'Egypt Excursions Online',
          accountNumber: '1001234567890',
          iban: 'EG380001001001234567890',
          swiftCode: 'CIBEEGCX',
          currency: paymentResult.currency,
          specialRequests: customer.specialRequests,
          hotelPickupDetails: customer.hotelPickupDetails,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
        });
      } else {
        // Send regular payment confirmation for card payments
        await EmailService.sendPaymentConfirmation({
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email,
          paymentId: paymentResult.paymentId,
          paymentMethod: paymentMethod,
          amount: `$${pricing.total.toFixed(2)}`,
          currency: paymentResult.currency,
          bookingId: `BOOKING-${Date.now()}`,
          tourTitle: cart.length === 1 ? cart[0].title : `${cart.length} Tours`,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
        });
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

        // Generate unique booking reference
        const bookingReference = await generateUniqueBookingReference();

        const booking = await Booking.create({
          bookingReference, // Provide the reference explicitly
          tour: tour._id,
          user: user._id,
          date: bookingDate,
          time: bookingTime,
          guests: totalGuests,
          totalPrice: itemTotalPrice,
          status: isBankTransfer ? 'Pending' : 'Confirmed',
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
    
    // Send Enhanced Booking Confirmation
    try {
      // Get booking option from first cart item
      const mainCartItem = cart[0];
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

      await EmailService.sendBookingConfirmation({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        tourTitle: cart.length === 1 ? mainTour?.title || 'Tour' : `${cart.length} Tours`,
        // Use original cart date to avoid timezone issues with MongoDB UTC storage
        bookingDate: emailBookingDate,
        bookingTime: emailBookingTime,
        participants: `${mainBooking.guests} participant${mainBooking.guests !== 1 ? 's' : ''}`,
        participantBreakdown: participantParts.join(', '),
        totalPrice: `$${pricing.total.toFixed(2)}`,
        bookingId: bookingId,
        bookingOption: bookingOption,
        specialRequests: customer.specialRequests,
        hotelPickupDetails: customer.hotelPickupDetails,
        meetingPoint: mainTour?.meetingPoint || "Meeting point will be confirmed 24 hours before tour",
        contactNumber: "+20 11 42255624",
        tourImage: mainTour?.image,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
      });
    } catch (emailError) {
      console.error('Failed to send booking confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    // Send Admin Alert
    try {
      // Prepare detailed tour information
      const tourDetails = await Promise.all(cart.map(async (item) => {
        const tour = await Tour.findById(item._id || item.id);

        // Get add-ons details
        const addOns: string[] = [];
        if (item.selectedAddOns && item.selectedAddOnDetails) {
          Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
            const addOnDetail = item.selectedAddOnDetails?.[addOnId];
            if (addOnDetail && quantity > 0) {
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
              if (addOnDetail && quantity > 0) {
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
          price: `$${getItemTotal(item).toFixed(2)}`
        };
      }));

      await EmailService.sendAdminBookingAlert({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        tourTitle: cart.length === 1 ? mainTour?.title || 'Tour' : `${cart.length} Tours`,
        bookingId: bookingId,
        // Use original cart date to avoid timezone issues with MongoDB UTC storage
        bookingDate: emailBookingDate,
        totalPrice: `$${pricing.total.toFixed(2)}`,
        paymentMethod: paymentMethod,
        specialRequests: customer.specialRequests,
        hotelPickupDetails: customer.hotelPickupDetails,
        adminDashboardLink: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/bookings/${bookingId}`,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
        tours: tourDetails
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