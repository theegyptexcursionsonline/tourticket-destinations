export {};
// Payment endpoints are unauthenticated by necessity — a guest checks out
// without an account. Nothing but a limiter stands between the public and
// unbounded Stripe PaymentIntent creation, which funds card-testing against
// this Stripe account and burns the provider's own rate limits.
//
// The sibling storefront guarded these; this fork never did (fork-divergence
// audit, 24/08).
const fs = require('fs');
const path = require('path');
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const PAYMENT_ROUTES = [
  ['app/api/checkout/create-payment-intent/route.ts', 'checkout-payment-intent'],
  ['app/api/checkout/create-checkout-session/route.ts', 'checkout-session'],
] as const;

describe('payment endpoints are abuse-limited', () => {
  it.each(PAYMENT_ROUTES)('%s consumes the limiter before touching Stripe', (rel, action) => {
    const src = read(rel);
    expect(src).toContain("from '@/lib/security/guardPaymentEndpoint'");
    expect(src).toContain(`guardPaymentEndpoint(request, '${action}')`);
    expect(src).toContain('if (limited) return limited;');
    // The guard must run before the Stripe API call, not after it. (Matching
    // on "stripe" alone hits the import line and proves nothing.)
    const call = Math.min(
      ...['paymentIntents.create', 'sessions.create']
        .map((needle) => src.indexOf(needle))
        .filter((index) => index >= 0),
    );
    expect(call).toBeGreaterThan(0);
    expect(src.indexOf('guardPaymentEndpoint(request')).toBeLessThan(call);
  });

  it('counts in the database, not in one function instance', () => {
    const guard = read('lib/security/guardPaymentEndpoint.ts');
    expect(guard).toContain('enforcePublicActionLimits');
    // Serverless: an in-memory counter resets on every cold start, so it would
    // never actually limit anything.
    expect(read('lib/security/distributedAbuseLimit.ts')).toContain("from '@/lib/models/AbuseRateLimit'");
    expect(read('lib/models/AbuseRateLimit.ts')).toContain('abuse_scope_key_window_unique');
  });

  it('answers 429 with Retry-After rather than failing open', () => {
    const guard = read('lib/security/guardPaymentEndpoint.ts');
    expect(guard).toContain('status: 429');
    expect(guard).toContain("'Retry-After'");
    expect(guard).toMatch(/if \(verdict\.allowed\) return null;/);
  });
});
