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

  it('renders one truthful Stripe-managed inline payment surface', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/StripePaymentForm.tsx'),
      'utf8',
    );

    expect(source).toContain('data-testid="inline-payment-experience"');
    expect(source).toContain('Cards and eligible wallets stay on this page');
    expect(source).not.toContain('<span>Apple Pay</span>');
    expect(source).not.toContain('256-bit SSL encryption');
    expect(source).not.toContain('Fraud detection & buyer protection');
  });

  it('does not advertise unfinished PayPal or bank-transfer providers', () => {
    const checkoutSource = fs.readFileSync(
      path.join(process.cwd(), 'app/[locale]/checkout/CheckoutClientPage.tsx'),
      'utf8',
    );
    const footerSource = fs.readFileSync(
      path.join(process.cwd(), 'components/Footer.tsx'),
      'utf8',
    );

    expect(checkoutSource).not.toContain('SOON');
    expect(checkoutSource).not.toContain('paypal2.png');
    expect(footerSource).not.toContain('PaymentIcons.PayPal');
    expect(footerSource).not.toContain('PaymentIcons.Alipay');

    for (const locale of ['en', 'de', 'es', 'fr', 'ru']) {
      const messages = fs.readFileSync(path.join(process.cwd(), `messages/${locale}.json`), 'utf8');
      expect(messages).not.toMatch(/PayPal|bank transfers|Banküberweisungen|transferencias bancarias|virements bancaires|банковские переводы/i);
    }
  });

  it('enforces the same executable-provider policy before payment and booking', () => {
    const preparationSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/checkout/prepareStripeCheckout.ts'),
      'utf8',
    );
    const checkoutSource = fs.readFileSync(
      path.join(process.cwd(), 'app/api/checkout/route.ts'),
      'utf8',
    );
    const publicTenantSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/tenant.ts'),
      'utf8',
    );

    expect(preparationSource).toContain('resolveExecutablePaymentMethods');
    expect(preparationSource).toContain("'CARD_PAYMENT_DISABLED'");
    expect(preparationSource).toContain("'PAYMENT_EXPERIENCE_MISMATCH'");
    expect(checkoutSource).toContain('resolveExecutablePaymentMethods');
    expect(publicTenantSource).toContain('resolveExecutablePaymentMethods');
  });

  it('persists admin availability through the runtime payment-method field', () => {
    const adminPage = fs.readFileSync(
      path.join(process.cwd(), 'app/admin/tenants/[tenantId]/page.tsx'),
      'utf8',
    );
    const adminRoute = fs.readFileSync(
      path.join(process.cwd(), 'app/api/admin/tenants/[tenantId]/route.ts'),
      'utf8',
    );

    expect(adminPage).toContain("updateField('payments.supportedPaymentMethods'");
    expect(adminPage).not.toContain("updateField(`payments.${key}`");
    expect(adminRoute).toContain('validatePaymentMethodUpdate');
  });
});
