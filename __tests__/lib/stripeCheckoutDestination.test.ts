import { isAllowedStripeCheckoutUrl } from '@/lib/checkout/stripeCheckoutDestination';

describe('Stripe Checkout destination allowlist', () => {
  it.each([
    'https://checkout.stripe.com/c/pay/cs_live_example',
    'https://billing.stripe.com/p/session/test',
  ])('accepts a provider-owned HTTPS destination: %s', (url) => {
    expect(isAllowedStripeCheckoutUrl(url)).toBe(true);
  });

  it.each([
    'http://checkout.stripe.com/c/pay/example',
    'https://stripe.com.evil.example/c/pay/example',
    'https://user:pass@checkout.stripe.com/c/pay/example',
    'https://checkout.stripe.com:444/c/pay/example',
    '//checkout.stripe.com/c/pay/example',
    'not-a-url',
  ])('rejects an unapproved redirect: %s', (url) => {
    expect(isAllowedStripeCheckoutUrl(url)).toBe(false);
  });
});
