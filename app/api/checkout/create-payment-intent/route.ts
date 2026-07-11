// app/api/checkout/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import { getTenantConfigCached, getTenantFromRequest } from '@/lib/tenant';
import { calculateCheckoutPricing, checkoutCustomerRef, checkoutFingerprint } from '@/lib/security/checkoutPricing';

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
    const { customer, cart: submittedCart, discountCode } = body;
    let cart = submittedCart;
    
    // Get tenantId from first cart item's tour
    const tenantId = await getTenantFromRequest();
    
    // Get tenant config for potential tenant-specific Stripe account
    const tenantConfig = await getTenantConfigCached(tenantId);

    // Validate required fields
    if (!customer || !cart || cart.length === 0) {
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

    const validatedCheckout = await calculateCheckoutPricing(cart, tenantId, discountCode);
    cart = validatedCheckout.cart;
    const pricing = {
      ...validatedCheckout.pricing,
      currency: tenantConfig?.payments?.currency || 'USD',
    };
    const normalizedEmail = String(customer.email).trim().toLowerCase();
    const currency = String(pricing.currency || 'USD').toLowerCase();
    const cartFingerprint = checkoutFingerprint(cart, tenantId, currency);
    const customerRef = checkoutCustomerRef(normalizedEmail);

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

    // Use tenant-specific Stripe account if configured, otherwise use default
    // Note: For Stripe Connect, you would use stripeAccount parameter
    const stripeOptions: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(pricing.total * 100), // Stripe expects amount in cents
      currency,
      description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''} - ${tenantConfig?.name || 'Tour Booking'}`,
      metadata: {
        has_booking_data: 'true',
        tenant_id: tenantId,
        checkout_fingerprint: cartFingerprint,
        customer_ref: customerRef,
        // Name/email are retained only for Stripe's recovery webhook. Phone,
        // pickup location and special requests are deliberately kept out.
        customer_email: normalizedEmail,
        customer_first_name: customer.firstName,
        customer_last_name: customer.lastName,
        cart_data: cartData,
        ...(cartData2 && { cart_data_2: cartData2 }),
        pricing_total: String(pricing.total),
        pricing_subtotal: String(pricing.subtotal || 0),
        pricing_service_fee: String(pricing.serviceFee || 0),
        pricing_tax: String(pricing.tax || 0),
        pricing_discount: String(pricing.discount || 0),
        pricing_currency: pricing.currency,
        discount_code: discountCode || 'none',
      },
      // receipt_email removed - we send our own booking confirmation email
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Create a PaymentIntent with Stripe
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create(stripeOptions, {
      idempotencyKey: `checkout-${customerRef.slice(0, 16)}-${cartFingerprint.slice(0, 16)}-${Math.round(pricing.total * 100)}`,
    });

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
