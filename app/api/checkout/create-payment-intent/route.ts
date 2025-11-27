// app/api/checkout/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer, pricing, cart, discountCode } = body;

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

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(pricing.total * 100), // Stripe expects amount in cents
      currency: (pricing.currency || 'USD').toLowerCase(),
      description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''}`,
      metadata: {
        customer_email: customer.email,
        customer_name: `${customer.firstName} ${customer.lastName}`,
        tours: cart.map((item: any) => item.title).join(', '),
        discount_code: discountCode || 'none',
      },
      // receipt_email removed - we send our own booking confirmation email
      automatic_payment_methods: {
        enabled: true,
      },
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
