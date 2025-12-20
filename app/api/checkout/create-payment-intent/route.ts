// app/api/checkout/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { getTenantConfigCached } from '@/lib/tenant';

// Initialize default Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

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

    // Use tenant-specific Stripe account if configured, otherwise use default
    // Note: For Stripe Connect, you would use stripeAccount parameter
    const stripeOptions: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(pricing.total * 100), // Stripe expects amount in cents
      currency: (pricing.currency || tenantConfig?.payments?.currency || 'USD').toLowerCase(),
      description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''} - ${tenantConfig?.name || 'Tour Booking'}`,
      metadata: {
        tenant_id: tenantId,
        tenant_name: tenantConfig?.name || 'Default',
        customer_email: customer.email,
        customer_name: `${customer.firstName} ${customer.lastName}`,
        tours: cart.map((item: any) => item.title).join(', '),
        discount_code: discountCode || 'none',
      },
      // receipt_email removed - we send our own booking confirmation email
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Create a PaymentIntent with Stripe
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
