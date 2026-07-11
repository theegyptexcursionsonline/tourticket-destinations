export const MAX_ADMIN_LOGIN_ATTEMPTS = 5;
export const ADMIN_LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

export function failedAdminLoginUpdate(currentAttempts: number, now = Date.now()) {
  const failedLoginAttempts = Math.max(0, currentAttempts) + 1;
  return {
    failedLoginAttempts,
    ...(failedLoginAttempts >= MAX_ADMIN_LOGIN_ATTEMPTS
      ? { loginLockedUntil: new Date(now + ADMIN_LOGIN_LOCKOUT_MS) }
      : {}),
  };
}

export function loginRetryAfterSeconds(lockedUntil: Date, now = Date.now()): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now) / 1000));
}
