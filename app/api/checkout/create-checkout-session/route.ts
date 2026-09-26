import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import {
  acquireCheckoutAttemptLease,
  holdsCheckoutAttemptLease,
  releaseCheckoutAttemptLease,
} from '@/lib/checkout/checkoutAttemptLease';
import {
  checkoutInputErrorResponse,
  prepareStripeCheckout,
  type PreparedStripeCheckout,
} from '@/lib/checkout/prepareStripeCheckout';
import { isAllowedStripeCheckoutUrl } from '@/lib/checkout/stripeCheckoutDestination';
import { guardPaymentEndpoint } from '@/lib/security/guardPaymentEndpoint';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    stripeInstance = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as never });
  }
  return stripeInstance;
}

/** Stripe's Checkout page lifetime; its minimum is 30 minutes. */
const PAGE_LIFETIME_SECONDS = 31 * 60;
/** A stored page is handed back only while it has this much time left to pay. */
const REUSE_MARGIN_SECONDS = 10 * 60;
/** How long the paid/unpaid quote record is kept after its page dies. */
const QUOTE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** States a quote record may be re-pointed at a newly opened page from. */
const REOPENABLE = ['open', 'expired', 'superseded'] as const;

const ALREADY_PAID_MESSAGE = 'This booking has already been paid. Please check your email for the confirmation.';
const PREPARING_MESSAGE = 'Secure checkout is being prepared — please try again in a moment.';
const REFUNDED_MESSAGE = 'The payment for this cart was refunded. Please start a new booking to pay again.';

/** A designed refusal: the guest is told what to do and no page is opened. */
class HostedCheckoutConflict extends Error {
  constructor(public code: string, message: string, public sessionId?: string) {
    super(message);
    this.name = 'HostedCheckoutConflict';
  }
}

// `sessionId` lets the browser send an already-paid guest to their confirmation
// instead of showing them an error about a payment that actually succeeded.
const conflict = (code: string, message: string, sessionId?: string) => NextResponse.json(
  { success: false, code, message, ...(sessionId ? { sessionId } : {}) },
  { status: 409, headers: { 'Cache-Control': 'no-store' } },
);

const isDuplicateKeyError = (error: unknown): boolean =>
  Boolean(error) && (error as { code?: number }).code === 11000;

/**
 * Money already taken on this page. `complete` covers a page Stripe has settled
 * even when the payment_status field is not populated on the object we hold.
 */
const pageWasPaid = (page: { status?: string | null; payment_status?: string | null } | null): boolean =>
  Boolean(page) && (page!.payment_status === 'paid' || page!.status === 'complete');

type StoredQuote = {
  _id: unknown;
  quoteBinding: string;
  checkoutSessionId: string;
  status: string;
  checkoutClosedAt?: Date | null;
};

/**
 * A page we have not seen Stripe confirm as closed. Intending to close a page is
 * not closing it: if this invocation dies in between (Stripe timing out, or the
 * platform's 26s function limit), the page is still able to charge the guest, so
 * it must stay in the next request's sights to be retried — or recognised as
 * paid — rather than quietly disappearing while a second page is opened.
 */
const stillPayable = (quote: StoredQuote): boolean =>
  (quote.status === 'open' || quote.status === 'superseded')
  && !quote.checkoutClosedAt
  && Boolean(quote.checkoutSessionId);

export async function POST(request: Request) {
  let prepared: PreparedStripeCheckout | undefined;
  let leaseToken: string | null = null;
  let session: Stripe.Checkout.Session | undefined;
  try {
    const limited = await guardPaymentEndpoint(request, 'checkout-session');
    if (limited) return limited;

    prepared = await prepareStripeCheckout(request, 'hosted');
    const stripe = getStripe();

    // One request at a time may replace this attempt's payable page. Without
    // this, a double-tapped Pay button can leave two live Stripe pages behind —
    // two charges and two bookings for one order, with nothing to refund them.
    leaseToken = await acquireCheckoutAttemptLease(prepared.tenantId, prepared.checkoutAttemptId);
    if (!leaseToken) return conflict('CHECKOUT_PREPARING', PREPARING_MESSAGE);

    try {
      const quotes = await CheckoutPaymentQuote.find({
        tenantId: prepared.tenantId,
        checkoutAttemptId: prepared.checkoutAttemptId,
        paymentExperience: 'hosted',
      }).lean<StoredQuote[]>();

      // Paid is terminal. Opening another page here would invite a second charge
      // for an order the webhook has already booked.
      const paidQuote = quotes.find((quote) => quote.status === 'paid');
      if (paidQuote) {
        throw new HostedCheckoutConflict('CHECKOUT_ALREADY_PAID', ALREADY_PAID_MESSAGE, paidQuote.checkoutSessionId);
      }

      // A refunded cart cannot be re-pointed at a new page without losing the
      // record of the money we gave back, so say what actually happened instead
      // of claiming the booking is paid and sending the guest to look for an
      // email that will never arrive.
      const thisCart = quotes.find((quote) => quote.quoteBinding === prepared!.quoteBinding);
      if (thisCart && !REOPENABLE.includes(thisCart.status as typeof REOPENABLE[number])) {
        throw new HostedCheckoutConflict(
          thisCart.status === 'refunded' ? 'CHECKOUT_REFUNDED' : 'CHECKOUT_ALREADY_PAID',
          thisCart.status === 'refunded' ? REFUNDED_MESSAGE : ALREADY_PAID_MESSAGE,
          thisCart.status === 'refunded' ? undefined : thisCart.checkoutSessionId,
        );
      }

      const payablePages = quotes.filter(stillPayable);

      // Reuse: the guest backed out of Stripe and pressed Pay again on the same
      // cart. The page they left is still the right page. Only a page we never
      // set out to replace is handed back — one already marked gets retired.
      const sameCart = payablePages.find(
        (quote) => quote.status === 'open' && quote.quoteBinding === prepared!.quoteBinding,
      );
      if (sameCart) {
        const page = await stripe.checkout.sessions.retrieve(sameCart.checkoutSessionId).catch(() => null);
        if (pageWasPaid(page)) {
          throw new HostedCheckoutConflict('CHECKOUT_ALREADY_PAID', ALREADY_PAID_MESSAGE, sameCart.checkoutSessionId);
        }
        const usable = page
          && page.status === 'open'
          && page.amount_total === prepared.amountMinor
          && String(page.currency || '').toLowerCase() === prepared.currency.toLowerCase()
          && Number(page.expires_at || 0) - Math.floor(Date.now() / 1000) > REUSE_MARGIN_SECONDS
          && isAllowedStripeCheckoutUrl(page.url);
        if (usable) {
          return NextResponse.json({
            success: true,
            sessionId: page.id,
            url: page.url,
            pricing: prepared.pricing,
            reused: true,
          }, { headers: { 'Cache-Control': 'no-store' } });
        }
      }

      // Retire: every page of this attempt that could still charge the guest is
      // closed first, so they are never holding two payable pages.
      for (const quote of payablePages) {
        // Marked before Stripe is asked, so a payment that slips through on this
        // page is recognised by the webhook as belonging to a replaced page. The
        // mark does NOT say the page is closed — only Stripe's answer does, below.
        await CheckoutPaymentQuote.updateOne(
          {
            _id: quote._id,
            tenantId: prepared.tenantId,
            status: { $in: ['open', 'superseded'] },
            checkoutClosedAt: { $exists: false },
          },
          { $set: { status: 'superseded' }, $addToSet: { supersededSessionIds: quote.checkoutSessionId } },
        );
        let retired: Stripe.Checkout.Session | null = null;
        try {
          retired = await stripe.checkout.sessions.expire(quote.checkoutSessionId);
        } catch (error) {
          const page = await stripe.checkout.sessions.retrieve(quote.checkoutSessionId).catch(() => null);
          // Stripe refuses to expire a page that has been paid. That payment is
          // the order; the webhook books it.
          if (pageWasPaid(page)) {
            throw new HostedCheckoutConflict('CHECKOUT_ALREADY_PAID', ALREADY_PAID_MESSAGE, quote.checkoutSessionId);
          }
          // Anything else: fail closed. The page keeps no closed marker, so the
          // next request lists it again and tries to close it once more.
          throw error;
        }
        if (pageWasPaid(retired)) {
          throw new HostedCheckoutConflict('CHECKOUT_ALREADY_PAID', ALREADY_PAID_MESSAGE, quote.checkoutSessionId);
        }
        if (retired?.status !== 'expired') {
          throw new Error(`Stripe did not confirm the previous checkout page closed (${retired?.status || 'unknown'}).`);
        }
        // Only now is the page provably unable to take money.
        await CheckoutPaymentQuote.updateOne(
          { _id: quote._id, tenantId: prepared.tenantId },
          { $set: { checkoutClosedAt: new Date() } },
        );
      }

      // Closing pages can take longer than the lease. Re-fence before opening a
      // payable page: if this request no longer holds the claim, another one does,
      // and only one of us may open a page.
      if (!await holdsCheckoutAttemptLease(prepared.tenantId, prepared.checkoutAttemptId, leaseToken)) {
        throw new HostedCheckoutConflict('CHECKOUT_PREPARING', PREPARING_MESSAGE);
      }

      // A fresh nonce per page. The old key was fixed per (tenant, attempt,
      // cart), so every return to checkout hit Stripe's idempotency_error for
      // 24 hours and the guest simply could not pay.
      const pageNonce = randomUUID().replace(/-/g, '').slice(0, 16);
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
        expires_at: Math.floor(Date.now() / 1000) + PAGE_LIFETIME_SECONDS,
        locale: 'auto',
      }, {
        idempotencyKey: `network-hosted-${prepared.tenantId}-${prepared.checkoutAttemptId}-${prepared.quoteBinding.slice(0, 24)}-${pageNonce}`,
      });
      if (!isAllowedStripeCheckoutUrl(session.url)) {
        throw new Error('Stripe Checkout did not return an approved hosted URL.');
      }

      const pageExpirySeconds = Number(session.expires_at)
        || Math.floor(Date.now() / 1000) + PAGE_LIFETIME_SECONDS;
      const checkoutExpiresAt = new Date(pageExpirySeconds * 1000);

      // The same cart may be reopened, so the record accepts a new page id — but
      // only from a state that has not been paid. A paid quote does not match, the
      // upsert then collides with the unique (tenant, binding) index, and the new
      // page is expired below instead of shadowing a settled payment.
      const saved = await CheckoutPaymentQuote.findOneAndUpdate(
        {
          tenantId: prepared.tenantId,
          quoteBinding: prepared.quoteBinding,
          status: { $in: [...REOPENABLE] },
        },
        {
          $set: {
            checkoutAttemptId: prepared.checkoutAttemptId,
            checkoutSessionId: session.id,
            status: 'open',
            checkoutExpiresAt,
            expiresAt: new Date(checkoutExpiresAt.getTime() + QUOTE_RETENTION_MS),
          },
          // The new page is open, so the record must not claim it is closed.
          $unset: { checkoutClosedAt: '' },
          $setOnInsert: {
            paymentExperience: 'hosted',
            customer: prepared.customer,
            cart: prepared.cart,
            cartSummary: prepared.cartSummary,
            pricing: prepared.pricing,
            discountCode: prepared.discountCode,
          },
        },
        { upsert: true, new: true },
      ).lean<{ checkoutSessionId?: string; checkoutAttemptId?: string } | null>();
      if (!saved || saved.checkoutSessionId !== session.id || saved.checkoutAttemptId !== prepared.checkoutAttemptId) {
        throw new Error('Hosted checkout quote could not be recorded for this page.');
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
    if (error instanceof HostedCheckoutConflict) return conflict(error.code, error.message, error.sessionId);
    if (isDuplicateKeyError(error)) {
      // The record for this cart is in a state we refuse to re-point at a new
      // page (settled, or refunded). Either way no page is left payable.
      console.error('Create Stripe Checkout Session: quote already settled for this cart.', error);
      return conflict('CHECKOUT_ALREADY_SETTLED', ALREADY_PAID_MESSAGE);
    }
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
  } finally {
    if (prepared && leaseToken) {
      await releaseCheckoutAttemptLease(prepared.tenantId, prepared.checkoutAttemptId, leaseToken)
        .catch(() => undefined);
    }
  }
}
