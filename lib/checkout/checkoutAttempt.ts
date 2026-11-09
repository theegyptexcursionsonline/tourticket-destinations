import { safeSessionStorage } from '@/lib/browserStorage';
const CHECKOUT_ATTEMPT_KEY = 'network-checkout-attempt-v1';

function validAttemptId(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeCheckoutAttemptId(value: unknown): string | null {
  return validAttemptId(value) ? value.toLowerCase() : null;
}

export function getOrCreateCheckoutAttemptId(): string {
  const existing = safeSessionStorage.getItem(CHECKOUT_ATTEMPT_KEY);
  if (validAttemptId(existing)) return existing.toLowerCase();
  const value = window.crypto.randomUUID();
  safeSessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, value);
  return value;
}

export function clearCheckoutAttemptId(): void {
  safeSessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
}
