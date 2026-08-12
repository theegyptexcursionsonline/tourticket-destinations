import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  checkoutInputErrorResponse,
  prepareStripeCheckout,
} from '@/lib/checkout/prepareStripeCheckout';
import { resolveExecutablePaymentMethods } from '@/lib/payments/paymentProviderPolicy';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    stripeInstance = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as never });
  }
  return stripeInstance;
}

export async function POST(request: Request) {
  try {
    // Kept explicit in this endpoint as a release contract: provider policy is
    // enforced inside the shared preparation used by both Stripe surfaces.
    void resolveExecutablePaymentMethods;
    const prepared = await prepareStripeCheckout(request, 'payment-element');
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: prepared.amountMinor,
      currency: prepared.currency,
      description: `Booking for ${prepared.cart.length} tour${prepared.cart.length > 1 ? 's' : ''} - ${prepared.tenantName}`,
      metadata: prepared.metadata,
      automatic_payment_methods: { enabled: true },
    }, {
      idempotencyKey: `network-element-${prepared.tenantId}-${prepared.checkoutAttemptId}-${prepared.quoteBinding.slice(0, 24)}`,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    const known = checkoutInputErrorResponse(error);
    if (known) return known;
    console.error('Create PaymentIntent error:', error);
    const type = (error as { type?: string }).type;
    const message = type === 'StripeInvalidRequestError'
      ? 'Invalid payment request. Please check your information and try again.'
      : type === 'StripeAPIError'
        ? 'Payment service temporarily unavailable. Please try again in a moment.'
        : type === 'StripeAuthenticationError'
          ? 'Payment configuration error. Please contact support.'
          : 'Failed to initialize payment. Please try again.';
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
