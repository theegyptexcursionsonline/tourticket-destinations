import { buildTenantUpdatePayload } from '@/lib/admin/tenantUpdatePayload';

describe('buildTenantUpdatePayload', () => {
  it('sends only the selected checkout presentation for a legacy tenant', () => {
    const hydratedTenant = {
      tenantId: 'sharm-ausfluege',
      name: 'Sharm Ausflüge Online',
      seo: { ogImage: '', defaultTitle: '' },
      payments: {
        currency: 'EUR',
        supportedPaymentMethods: ['card'],
        paymentExperience: 'modal',
      },
    };

    expect(buildTenantUpdatePayload(
      hydratedTenant,
      new Set(['payments.paymentExperience']),
    )).toEqual({
      payments: {
        currency: 'EUR',
        supportedPaymentMethods: ['card'],
        paymentExperience: 'modal',
      },
    });
  });

  it('includes complete edited sections without including unrelated sections', () => {
    expect(buildTenantUpdatePayload({
      contact: { phone: '+20 123', email: 'untouched@example.com' },
      payments: { currency: 'EUR', currencySymbol: '€' },
      seo: { ogImage: '' },
    }, ['contact.phone', 'payments.currency'])).toEqual({
      contact: { phone: '+20 123', email: 'untouched@example.com' },
      payments: { currency: 'EUR', currencySymbol: '€' },
    });
  });

  it('rejects prototype-polluting paths', () => {
    expect(() => buildTenantUpdatePayload({}, ['__proto__.polluted'])).toThrow(
      'Invalid tenant update path',
    );
  });
});
