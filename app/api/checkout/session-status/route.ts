import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import { getTenantFromRequest } from '@/lib/tenant';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    stripeInstance = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as never });
  }
  return stripeInstance;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')?.trim() || '';
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9]{10,240}$/.test(sessionId)) {
    return NextResponse.json(
      { success: false, code: 'INVALID_CHECKOUT_SESSION', message: 'This checkout confirmation link is invalid.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    await dbConnect();
    const tenantId = await getTenantFromRequest();
    const quote = await CheckoutPaymentQuote.findOne({ tenantId, checkoutSessionId: sessionId })
      .select('quoteBinding status paymentIntentId -_id')
      .lean<{ quoteBinding: string; status: string; paymentIntentId?: string } | null>();
    if (!quote) {
      return NextResponse.json(
        { success: false, code: 'CHECKOUT_SESSION_NOT_FOUND', message: 'This checkout confirmation link is not available for this website.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (
      session.metadata?.has_booking_data !== 'true'
      || session.metadata.checkout_experience !== 'hosted'
      || session.metadata.tenant_id !== tenantId
      || session.metadata.quote_binding !== quote.quoteBinding
    ) {
      return NextResponse.json(
        { success: false, code: 'CHECKOUT_SESSION_NOT_FOUND', message: 'This checkout confirmation link is no longer available.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
    const bookings = paymentIntentId
      ? await Booking.find({ tenantId, paymentId: paymentIntentId })
        .select('bookingReference status -_id')
        .sort({ createdAt: 1 })
        .lean<Array<{ bookingReference: string; status?: string }>>()
      : [];
    const confirmed = bookings.length > 0
      && bookings.every((booking) => String(booking.status).toLowerCase() === 'confirmed');
    const status = confirmed
      ? 'confirmed'
      : quote.status === 'refunded'
        ? 'refunded'
        : session.payment_status === 'paid'
          ? 'processing'
          : session.status === 'expired'
            ? 'expired'
            : 'open';

    return NextResponse.json({
      success: true,
      status,
      paymentStatus: session.payment_status,
      bookingReferences: confirmed ? bookings.map((booking) => booking.bookingReference) : [],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const notFound = (error as { type?: string }).type === 'StripeInvalidRequestError';
    console.error('Checkout Session status lookup failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        success: false,
        code: notFound ? 'CHECKOUT_SESSION_NOT_FOUND' : 'CHECKOUT_STATUS_UNAVAILABLE',
        message: notFound
          ? 'This checkout confirmation link is no longer available.'
          : 'Booking confirmation is temporarily unavailable. Please try again.',
      },
      { status: notFound ? 404 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
