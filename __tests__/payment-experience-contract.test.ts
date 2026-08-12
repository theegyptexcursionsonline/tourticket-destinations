import fs from 'node:fs';
import path from 'node:path';

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('per-tenant checkout presentation contract', () => {
  it('persists and publicly exposes one validated tenant setting', () => {
    const model = source('lib/models/Tenant.ts');
    const publicTenant = source('lib/tenant.ts');
    const adminRoute = source('app/api/admin/tenants/[tenantId]/route.ts');

    expect(model).toContain("enum: ['inline', 'modal', 'hosted']");
    expect(publicTenant).toContain('paymentExperience: paymentExperienceOrDefault');
    expect(adminRoute).toContain('validatePaymentExperienceUpdate');
    expect(adminRoute).toContain('canAccessTenant(auth, tenantId)');
    expect(adminRoute).toContain("field: 'payments.paymentExperience'");
  });

  it('renders all three admin choices and all three customer experiences', () => {
    const admin = source('app/admin/tenants/[tenantId]/page.tsx');
    const form = source('components/StripePaymentForm.tsx');

    for (const label of ['Inline payment', 'Secure modal', 'Stripe-hosted']) expect(admin).toContain(label);
    expect(form).toContain('data-testid="inline-payment-experience"');
    expect(form).toContain('data-testid="modal-payment-experience"');
    expect(form).toContain('data-testid="hosted-payment-experience"');
    expect(form).not.toContain('<span>Apple Pay</span>');
  });

  it('keeps endpoint selection server-owned and hosted recovery tenant-scoped', () => {
    const preparation = source('lib/checkout/prepareStripeCheckout.ts');
    const sessionStatus = source('app/api/checkout/session-status/route.ts');
    const webhook = source('app/api/webhooks/stripe/route.ts');

    expect(preparation).toContain("'PAYMENT_EXPERIENCE_MISMATCH'");
    expect(preparation).toContain("endpoint === 'hosted'");
    expect(sessionStatus).toContain('findOne({ tenantId, checkoutSessionId: sessionId })');
    expect(webhook).toContain('checkoutItemKey: `${bookingTenantId}:${paymentId}:${cartIndex}`');
    expect(webhook).toContain('await bookingSession.commitTransaction()');
    expect(webhook).toContain("await refundHostedPayment('hosted_booking_creation_failed')");
  });
});
