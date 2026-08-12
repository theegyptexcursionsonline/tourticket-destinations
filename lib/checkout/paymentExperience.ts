export const PAYMENT_EXPERIENCES = ['inline', 'modal', 'hosted'] as const;

export type PaymentExperience = (typeof PAYMENT_EXPERIENCES)[number];

// Existing network tenants already use inline Stripe. Preserve that behaviour
// until an administrator deliberately chooses another presentation.
export const DEFAULT_PAYMENT_EXPERIENCE: PaymentExperience = 'inline';

export function isPaymentExperience(value: unknown): value is PaymentExperience {
  return typeof value === 'string'
    && PAYMENT_EXPERIENCES.includes(value as PaymentExperience);
}

export function paymentExperienceOrDefault(value: unknown): PaymentExperience {
  return isPaymentExperience(value) ? value : DEFAULT_PAYMENT_EXPERIENCE;
}

export type PaymentExperienceUpdateValidation =
  | { ok: true; experience?: PaymentExperience }
  | { ok: false; status: 400; code: string; error: string };

export function validatePaymentExperienceUpdate(payments: unknown): PaymentExperienceUpdateValidation {
  if (!payments || typeof payments !== 'object' || Array.isArray(payments)) return { ok: true };
  const record = payments as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, 'paymentExperience')) return { ok: true };
  if (!isPaymentExperience(record.paymentExperience)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_PAYMENT_EXPERIENCE',
      error: 'Choose inline payment, secure modal, or Stripe-hosted checkout.',
    };
  }
  return { ok: true, experience: record.paymentExperience };
}
