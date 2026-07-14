/**
 * Unit tests: admin login audit helpers.
 *
 * Every login attempt outcome must produce a well-formed audit entry with
 * the real client IP (Netlify header first) and a bounded user agent.
 */
import { buildLoginAuditEntry, extractClientInfo } from '@/lib/auth/loginAudit';
import { LOGIN_AUDIT_OUTCOMES } from '@/lib/auth/loginAuditOutcomes';

function headers(map: Record<string, string>): { get(name: string): string | null } {
  return { get: (name: string) => map[name.toLowerCase()] ?? null };
}

describe('extractClientInfo', () => {
  it('prefers the Netlify client IP header', () => {
    const info = extractClientInfo(headers({
      'x-nf-client-connection-ip': '41.32.10.5',
      'x-forwarded-for': '10.0.0.1, 41.32.10.5',
      'user-agent': 'Mozilla/5.0',
    }));
    expect(info).toEqual({ ip: '41.32.10.5', userAgent: 'Mozilla/5.0' });
  });

  it('falls back to the first x-forwarded-for hop', () => {
    const info = extractClientInfo(headers({ 'x-forwarded-for': '196.219.1.2, 10.0.0.1' }));
    expect(info.ip).toBe('196.219.1.2');
  });

  it('defaults to unknown when headers are absent', () => {
    expect(extractClientInfo(headers({}))).toEqual({ ip: 'unknown', userAgent: 'unknown' });
  });

  it('bounds an oversized user agent', () => {
    const info = extractClientInfo(headers({ 'user-agent': 'x'.repeat(600) }));
    expect(info.userAgent).toHaveLength(256);
  });
});

describe('buildLoginAuditEntry', () => {
  it('normalizes the email and carries the outcome', () => {
    const entry = buildLoginAuditEntry(
      headers({ 'x-nf-client-connection-ip': '41.32.10.5' }),
      '  Info@Egypt-ExcursionsOnline.COM ',
      'wrong_password',
    );
    expect(entry).toEqual({
      email: 'info@egypt-excursionsonline.com',
      outcome: 'wrong_password',
      ip: '41.32.10.5',
      userAgent: 'unknown',
    });
  });

  it('covers every outcome the login route can record', () => {
    expect(LOGIN_AUDIT_OUTCOMES).toEqual(
      expect.arrayContaining([
        'success',
        'unknown_account',
        'wrong_password',
        'locked',
        'rate_limited',
        'inactive',
        'not_admin',
        'portal_rejected',
      ]),
    );
  });
});
