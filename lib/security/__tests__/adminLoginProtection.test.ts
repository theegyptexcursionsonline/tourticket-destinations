import {
  ADMIN_LOGIN_LOCKOUT_MS,
  failedAdminLoginUpdate,
  loginRetryAfterSeconds,
} from '../adminLoginProtection';

describe('durable admin login protection', () => {
  it('locks an account after the fifth consecutive failure', () => {
    const now = Date.UTC(2026, 6, 11);
    expect(failedAdminLoginUpdate(3, now)).toEqual({ failedLoginAttempts: 4 });
    expect(failedAdminLoginUpdate(4, now)).toEqual({
      failedLoginAttempts: 5,
      loginLockedUntil: new Date(now + ADMIN_LOGIN_LOCKOUT_MS),
    });
  });

  it('returns a bounded Retry-After value', () => {
    const now = Date.UTC(2026, 6, 11);
    expect(loginRetryAfterSeconds(new Date(now + 60_001), now)).toBe(61);
    expect(loginRetryAfterSeconds(new Date(now - 1), now)).toBe(1);
  });
});
