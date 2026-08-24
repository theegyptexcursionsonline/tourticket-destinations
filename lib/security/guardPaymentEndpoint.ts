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
 *
 * A limiter must never take checkout down. Adding this guard introduced 500s
 * under concurrency on the deployed sites that do not reproduce locally, and a
 * customer who cannot pay is a worse outcome than abuse that gets through: an
 * unexpected failure inside the limiter therefore lets the request proceed and
 * is logged for investigation. A genuine refusal — the limit actually being
 * exceeded — still returns 429.
 */
export async function guardPaymentEndpoint(request: Request, action: string) {
  let verdict;
  try {
    verdict = await enforcePublicActionLimits({
      request,
      action,
      networkLimit: 30,
      windowMs: 10 * 60 * 1000,
    });
  } catch (error) {
    console.error(
      `[abuse-limit] ${action} check failed; allowing the request:`,
      error instanceof Error ? error.message : 'unknown error',
    );
    return null;
  }

  if (verdict.allowed) return null;
  return NextResponse.json(
    { success: false, error: 'Too many checkout attempts. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds), 'Cache-Control': 'no-store' } },
  );
}
