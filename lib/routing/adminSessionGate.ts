/**
 * Defence in depth for the admin portal: requests that carry no plausible
 * admin session never reach admin page code.
 *
 * The authority stays in one place — `requireAdminAuth`, which verifies the
 * signature and re-reads the account (active, two-factor, portal scope,
 * permissions) for every admin page that reads data and every admin API. This
 * gate deliberately does not verify the signature: it only decides whether a
 * request is worth rendering an admin page for. A request without a
 * well-formed, unexpired admin-scoped session cookie gets the sign-in screen
 * instead, so an anonymous `curl` can never trigger a page's data read even if
 * a future page forgets its own guard.
 */

/** Data-free route the proxy renders for requests without a session. */
export const ADMIN_SIGN_IN_PATH = '/admin/sign-in';

/** The admin portal's httpOnly session cookie. */
export const ADMIN_SESSION_COOKIE = 'admin-auth-token';

// Full sessions and the short-lived two-factor enrollment session. Any other
// scope (for example a customer session) is refused.
const ADMIN_SESSION_SCOPES = new Set(['admin', 'admin-2fa-enrollment']);

export function isAdminPagePath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isAdminSignInPath(pathname: string): boolean {
  return pathname === ADMIN_SIGN_IN_PATH || pathname === `${ADMIN_SIGN_IN_PATH}/`;
}

function decodeJwtPayload(segment: string): unknown {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * True when the cookie is shaped like an unexpired admin session token. A
 * forged token can pass this check; it is then refused by `requireAdminAuth`
 * before any data is read.
 */
export function hasPlausibleAdminSession(
  token: string | undefined | null,
  nowMs: number = Date.now(),
): boolean {
  if (!token) return false;
  const segments = token.trim().split('.');
  if (segments.length !== 3 || segments.some((segment) => segment.length === 0)) {
    return false;
  }
  try {
    const payload = decodeJwtPayload(segments[1]);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    const claims = payload as Record<string, unknown>;
    if (typeof claims.scope !== 'string' || !ADMIN_SESSION_SCOPES.has(claims.scope)) return false;
    if (typeof claims.sub !== 'string' || claims.sub.length === 0) return false;
    if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) return false;
    return claims.exp * 1000 > nowMs;
  } catch {
    return false;
  }
}
