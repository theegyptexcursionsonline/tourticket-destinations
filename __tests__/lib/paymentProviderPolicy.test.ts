import {
  normalizeConfiguredPaymentMethods,
  resolveExecutablePaymentMethods,
  unsupportedConfiguredPaymentMethods,
  validatePaymentMethodUpdate,
} from '@/lib/payments/paymentProviderPolicy';

describe('paymentProviderPolicy', () => {
  it('deduplicates known configured methods without inventing a default', () => {
    expect(normalizeConfiguredPaymentMethods(['card', 'card', 'paypal', 'cash', null])).toEqual([
      'card',
      'paypal',
    ]);
    expect(normalizeConfiguredPaymentMethods(undefined)).toEqual([]);
  });

  it('only exposes providers with a complete executable lifecycle', () => {
    expect(resolveExecutablePaymentMethods(['card', 'paypal', 'bank'])).toEqual(['card']);
    expect(resolveExecutablePaymentMethods(['paypal', 'bank'])).toEqual([]);
  });

  it('reports legacy configured methods that must remain fail-closed', () => {
    expect(unsupportedConfiguredPaymentMethods(['bank', 'card', 'paypal'])).toEqual(['bank', 'paypal']);
  });

  it('accepts a real card toggle, including a deliberate checkout shutdown', () => {
    expect(validatePaymentMethodUpdate({ supportedPaymentMethods: ['card', 'card'] })).toEqual({
      ok: true,
      methods: ['card'],
    });
    expect(validatePaymentMethodUpdate({ supportedPaymentMethods: [] })).toEqual({ ok: true, methods: [] });
  });

  it('rejects retired fields, unknown values, and incomplete providers', () => {
    expect(validatePaymentMethodUpdate({ stripeEnabled: true })).toMatchObject({
      ok: false,
      status: 400,
      code: 'RETIRED_PAYMENT_FIELDS',
    });
    expect(validatePaymentMethodUpdate({ supportedPaymentMethods: 'card' })).toMatchObject({
      ok: false,
      status: 400,
      code: 'INVALID_PAYMENT_METHODS',
    });
    expect(validatePaymentMethodUpdate({ supportedPaymentMethods: ['cash'] })).toMatchObject({
      ok: false,
      status: 400,
      code: 'INVALID_PAYMENT_METHODS',
    });
    expect(validatePaymentMethodUpdate({ supportedPaymentMethods: ['card', 'paypal'] })).toMatchObject({
      ok: false,
      status: 409,
      code: 'PAYMENT_PROVIDER_NOT_READY',
    });
  });
});
