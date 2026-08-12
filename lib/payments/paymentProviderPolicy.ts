export const CUSTOMER_PAYMENT_METHODS = ['card', 'paypal', 'bank'] as const;

export type CustomerPaymentMethod = (typeof CUSTOMER_PAYMENT_METHODS)[number];

/** Providers with a complete customer payment lifecycle in this storefront. */
export const EXECUTABLE_PAYMENT_METHODS = ['card'] as const satisfies readonly CustomerPaymentMethod[];

const executableMethods = new Set<CustomerPaymentMethod>(EXECUTABLE_PAYMENT_METHODS);

export function normalizeConfiguredPaymentMethods(value: unknown): CustomerPaymentMethod[] {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.filter((method): method is CustomerPaymentMethod => (
    typeof method === 'string'
    && (CUSTOMER_PAYMENT_METHODS as readonly string[]).includes(method)
  ))));
}

export function resolveExecutablePaymentMethods(value: unknown): CustomerPaymentMethod[] {
  return normalizeConfiguredPaymentMethods(value).filter((method) => executableMethods.has(method));
}

export function unsupportedConfiguredPaymentMethods(value: unknown): CustomerPaymentMethod[] {
  return normalizeConfiguredPaymentMethods(value).filter((method) => !executableMethods.has(method));
}

export function isCustomerPaymentMethod(value: unknown): value is CustomerPaymentMethod {
  return typeof value === 'string'
    && (CUSTOMER_PAYMENT_METHODS as readonly string[]).includes(value);
}

export type PaymentMethodUpdateValidation =
  | { ok: true; methods?: CustomerPaymentMethod[] }
  | { ok: false; status: 400 | 409; code: string; error: string };

export function validatePaymentMethodUpdate(payments: unknown): PaymentMethodUpdateValidation {
  if (!payments || typeof payments !== 'object' || Array.isArray(payments)) return { ok: true };

  const record = payments as Record<string, unknown>;
  const retiredKeys = ['stripeEnabled', 'paypalEnabled', 'bankTransferEnabled']
    .filter((key) => Object.prototype.hasOwnProperty.call(record, key));
  if (retiredKeys.length > 0) {
    return {
      ok: false,
      status: 400,
      code: 'RETIRED_PAYMENT_FIELDS',
      error: 'Use supportedPaymentMethods to manage checkout availability.',
    };
  }

  if (!Object.prototype.hasOwnProperty.call(record, 'supportedPaymentMethods')) return { ok: true };
  if (!Array.isArray(record.supportedPaymentMethods)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_PAYMENT_METHODS',
      error: 'supportedPaymentMethods must be an array.',
    };
  }

  const unknownMethods = record.supportedPaymentMethods.filter((method) => !isCustomerPaymentMethod(method));
  if (unknownMethods.length > 0) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_PAYMENT_METHODS',
      error: 'supportedPaymentMethods contains an unknown payment provider.',
    };
  }

  const unsupportedMethods = unsupportedConfiguredPaymentMethods(record.supportedPaymentMethods);
  if (unsupportedMethods.length > 0) {
    return {
      ok: false,
      status: 409,
      code: 'PAYMENT_PROVIDER_NOT_READY',
      error: `${unsupportedMethods.join(', ')} cannot be enabled until provider setup and the complete payment lifecycle are verified.`,
    };
  }

  return { ok: true, methods: normalizeConfiguredPaymentMethods(record.supportedPaymentMethods) };
}
