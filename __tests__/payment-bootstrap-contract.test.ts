import fs from 'node:fs';
import path from 'node:path';

describe('payment bootstrap contract', () => {
  it('does not initialize Stripe with a missing publishable key', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/StripePaymentForm.tsx'),
      'utf8',
    );

    expect(source).toContain(
      'const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;',
    );
    expect(source).not.toContain(
      'loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)',
    );
  });
});
