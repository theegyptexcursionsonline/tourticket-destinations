import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import {
  checkoutInputErrorResponse,
  prepareStripeCheckout,
} from '@/lib/checkout/prepareStripeCheckout';
import { isAllowedStripeCheckoutUrl } from '@/lib/checkout/stripeCheckoutDestination';

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
  let session: Stripe.Checkout.Session | undefined;
  try {
    const prepared = await prepareStripeCheckout(request, 'hosted');
    const stripe = getStripe();
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        ui_mode: 'hosted',
        client_reference_id: prepared.checkoutAttemptId,
        customer_email: prepared.customer.email,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: prepared.currency,
            unit_amount: prepared.amountMinor,
            product_data: {
              name: prepared.cart.length === 1
                ? String(prepared.cart[0].title || 'Tour booking')
                : `${prepared.cart.length} tour bookings`,
              description: `Server-verified booking with ${prepared.tenantName}`,
            },
          },
        }],
        payment_intent_data: { metadata: prepared.metadata },
        metadata: prepared.metadata,
        success_url: `${prepared.tenantDomain}/${prepared.locale}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${prepared.tenantDomain}/${prepared.locale}/checkout?payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + (31 * 60),
        locale: 'auto',
      }, {
        idempotencyKey: `network-hosted-${prepared.tenantId}-${prepared.checkoutAttemptId}-${prepared.quoteBinding.slice(0, 24)}`,
      });
      if (!isAllowedStripeCheckoutUrl(session.url)) {
        throw new Error('Stripe Checkout did not return an approved hosted URL.');
      }

      const saved = await CheckoutPaymentQuote.findOneAndUpdate(
        { tenantId: prepared.tenantId, quoteBinding: prepared.quoteBinding },
        {
          $setOnInsert: {
            checkoutAttemptId: prepared.checkoutAttemptId,
            checkoutSessionId: session.id,
            paymentExperience: 'hosted',
            customer: prepared.customer,
            cart: prepared.cart,
            cartSummary: prepared.cartSummary,
            pricing: prepared.pricing,
            discountCode: prepared.discountCode,
            status: 'open',
            expiresAt: new Date((session.expires_at || Math.floor(Date.now() / 1000) + 1860) * 1000 + 7 * 24 * 60 * 60 * 1000),
          },
        },
        { upsert: true, new: true },
      ).lean();
      if (!saved || saved.checkoutSessionId !== session.id || saved.checkoutAttemptId !== prepared.checkoutAttemptId) {
        throw new Error('Hosted checkout idempotency conflict.');
      }
    } catch (error) {
      if (session?.status === 'open') {
        await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      pricing: prepared.pricing,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    const known = checkoutInputErrorResponse(error);
    if (known) return known;
    console.error('Create Stripe Checkout Session error:', error);
    const type = (error as { type?: string }).type;
    const message = type === 'StripeInvalidRequestError'
      ? 'Stripe could not prepare this checkout. Please review the booking and try again.'
      : type === 'StripeAPIError'
        ? 'Stripe is temporarily unavailable. Please try again in a moment.'
        : type === 'StripeAuthenticationError'
          ? 'Payment configuration is unavailable. Please contact support.'
          : 'Stripe Checkout could not be opened. Please try again.';
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
