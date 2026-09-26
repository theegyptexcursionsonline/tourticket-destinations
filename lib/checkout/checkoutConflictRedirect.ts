/**
 * Where to send a guest whose cart the server says is already paid.
 *
 * Their money is gone and the booking is being written, so an error message is
 * both wrong and alarming: send them to the confirmation for that page instead.
 * Pure and checked on purpose — the id and the locale end up in a URL this code
 * navigates to, so neither may be taken from the response as-is.
 */

const CHECKOUT_SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;
const CHECKOUT_LOCALES = ['en', 'de', 'es', 'fr', 'ru'] as const;

export type HostedCheckoutConflictPayload = {
  code?: unknown;
  sessionId?: unknown;
};

export function alreadyPaidReturnPath(
  payload: HostedCheckoutConflictPayload,
  locale: string,
): string | null {
  if (payload.code !== 'CHECKOUT_ALREADY_PAID') return null;
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';
  if (!CHECKOUT_SESSION_ID.test(sessionId)) return null;
  const safeLocale = (CHECKOUT_LOCALES as readonly string[]).includes(locale) ? locale : 'en';
  return `/${safeLocale}/checkout/return?session_id=${sessionId}`;
}
