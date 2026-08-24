import { NextResponse } from 'next/server';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';

/**
 * Payment endpoints are unauthenticated by necessity — a guest checks out
 * without an account — so nothing but a limiter stands between the public and
 * unbounded Stripe PaymentIntent creation. Left open it funds card-testing
 * against this account and burns the provider's own rate limits.
 *
 * The counter is Mongo-backed rather than per-instance, because these run on
 * serverless functions where an in-memory count resets on every cold start.
 */
export async function guardPaymentEndpoint(request: Request, action: string) {
  const verdict = await enforcePublicActionLimits({
    request,
    action,
    networkLimit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (verdict.allowed) return null;
  return NextResponse.json(
    { success: false, error: 'Too many checkout attempts. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds), 'Cache-Control': 'no-store' } },
  );
}
