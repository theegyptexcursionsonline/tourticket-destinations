const CHECKOUT_ATTEMPT_KEY = 'network-checkout-attempt-v1';

function validAttemptId(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeCheckoutAttemptId(value: unknown): string | null {
  return validAttemptId(value) ? value.toLowerCase() : null;
}

export function getOrCreateCheckoutAttemptId(): string {
  const existing = window.sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY);
  if (validAttemptId(existing)) return existing.toLowerCase();
  const value = window.crypto.randomUUID();
  window.sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, value);
  return value;
}

export function clearCheckoutAttemptId(): void {
  window.sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
}
