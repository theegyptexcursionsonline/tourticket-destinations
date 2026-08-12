import {
  paymentExperienceOrDefault,
  validatePaymentExperienceUpdate,
} from '@/lib/checkout/paymentExperience';

describe('tenant payment experience', () => {
  it.each(['inline', 'modal', 'hosted'] as const)('accepts %s', (experience) => {
    expect(validatePaymentExperienceUpdate({ paymentExperience: experience })).toEqual({ ok: true, experience });
    expect(paymentExperienceOrDefault(experience)).toBe(experience);
  });

  it.each(['redirect', 'card', '', null, 1])('rejects unsupported value %p', (paymentExperience) => {
    expect(validatePaymentExperienceUpdate({ paymentExperience })).toMatchObject({
      ok: false,
      status: 400,
      code: 'INVALID_PAYMENT_EXPERIENCE',
    });
  });

  it('preserves legacy tenants as inline and leaves unrelated updates alone', () => {
    expect(paymentExperienceOrDefault(undefined)).toBe('inline');
    expect(validatePaymentExperienceUpdate({ currency: 'USD' })).toEqual({ ok: true });
  });
});
