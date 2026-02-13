// app/api/checkout/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { getTenantConfigCached } from '@/lib/tenant';

// Lazy initialization to avoid build-time errors when env vars are missing
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }
  return _stripe;
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { customer, pricing, cart, discountCode, tenantId: requestTenantId } = body;
    
    // Get tenantId from first cart item's tour
    let tenantId = requestTenantId || 'default';
    if (cart && cart.length > 0 && (cart[0]._id || cart[0].id)) {
      const firstTour = await Tour.findById(cart[0]._id || cart[0].id).select('tenantId').lean();
      if (firstTour?.tenantId) {
        tenantId = firstTour.tenantId;
      }
    }
    
    // Get tenant config for potential tenant-specific Stripe account
    const tenantConfig = await getTenantConfigCached(tenantId);

    // Validate required fields
    if (!customer || !pricing || !cart || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required payment information' },
        { status: 400 }
      );
    }

    // Validate customer data
    if (!customer.email || !customer.firstName || !customer.lastName) {
      return NextResponse.json(
        { success: false, message: 'Please provide complete customer information (name and email)' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate pricing
    if (!pricing.total || pricing.total <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Build compact cart summary for Stripe metadata (500 char limit per value)
    const cartSummary = cart.map((item: any, index: number) => ({
      i: index,                                    // item index
      t: item._id || item.id,                      // tour ID
      d: item.selectedDate,                        // date YYYY-MM-DD
      tm: item.selectedTime || '10:00',            // time
      a: item.quantity || 1,                       // adults
      c: item.childQuantity || 0,                  // children
      n: item.infantQuantity || 0,                 // infants
      bp: item.selectedBookingOption?.price || item.discountPrice || item.price || 0, // base price
      bo: item.selectedBookingOption?.id || '',     // booking option ID
      bot: item.selectedBookingOption?.title || '', // booking option title
      ao: (item.selectedAddOns && item.selectedAddOnDetails)
        ? Object.entries(item.selectedAddOns).map(([id, q]) => ({
            id,
            q: Number(q),
            p: item.selectedAddOnDetails?.[id]?.price || 0,
            pg: !!item.selectedAddOnDetails?.[id]?.perGuest,
            t: item.selectedAddOnDetails?.[id]?.title || '',
          }))
        : [],
    }));

    // Serialize cart data, split if needed (Stripe metadata value limit is 500 chars)
    const cartJson = JSON.stringify(cartSummary);
    const cartData = cartJson.substring(0, 500);
    const cartData2 = cartJson.length > 500 ? cartJson.substring(500) : '';

    // Serialize hotel pickup location if present
    let hotelPickupLocationStr = '';
    if (customer.hotelPickupLocation) {
      try {
        hotelPickupLocationStr = JSON.stringify(customer.hotelPickupLocation);
      } catch { /* ignore */ }
    }

    // Use tenant-specific Stripe account if configured, otherwise use default
    // Note: For Stripe Connect, you would use stripeAccount parameter
    const stripeOptions: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(pricing.total * 100), // Stripe expects amount in cents
      currency: (pricing.currency || tenantConfig?.payments?.currency || 'USD').toLowerCase(),
      description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''} - ${tenantConfig?.name || 'Tour Booking'}`,
      metadata: {
        has_booking_data: 'true',
        tenant_id: tenantId,
        tenant_name: tenantConfig?.name || 'Default',
        customer_email: customer.email,
        customer_first_name: customer.firstName,
        customer_last_name: customer.lastName,
        customer_phone: customer.phone || '',
        hotel_pickup_details: customer.hotelPickupDetails || '',
        hotel_pickup_location: hotelPickupLocationStr,
        special_requests: customer.specialRequests || '',
        cart_data: cartData,
        ...(cartData2 && { cart_data_2: cartData2 }),
        pricing_total: String(pricing.total),
        pricing_subtotal: String(pricing.subtotal || 0),
        pricing_service_fee: String(pricing.serviceFee || 0),
        pricing_tax: String(pricing.tax || 0),
        pricing_discount: String(pricing.discount || 0),
        pricing_currency: pricing.currency || tenantConfig?.payments?.currency || 'USD',
        discount_code: discountCode || 'none',
      },
      // receipt_email removed - we send our own booking confirmation email
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Create a PaymentIntent with Stripe
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create(stripeOptions);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error: any) {
    console.error('Create PaymentIntent error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to initialize payment. Please try again.';

    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment request. Please check your information and try again.';
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Payment service temporarily unavailable. Please try again in a moment.';
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Payment configuration error. Please contact support.';
      console.error('STRIPE AUTHENTICATION ERROR - Check API keys!');
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
