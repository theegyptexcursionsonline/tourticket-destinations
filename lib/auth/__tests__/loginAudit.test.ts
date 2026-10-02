/**
 * @jest-environment node
 *
 * Unit tests: admin login audit helpers.
 *
 * Every login attempt outcome must produce a well-formed audit entry with the visitor's
 * address (the one the site's edge vouched for, never a forwarding header a client can
 * write) and a bounded user agent.
 */
import { buildLoginAuditEntry, extractClientInfo } from '@/lib/auth/loginAudit';
import { LOGIN_AUDIT_OUTCOMES } from '@/lib/auth/loginAuditOutcomes';
import { EDGE_VISITOR_HEADER, vouchForVisitor } from '@/lib/security/visitorAddress';

const SIGNING_SECRET = 'unit-test-login-audit-secret-at-least-32-chars';
// Behind the site's edge function, the sign-in route sees the edge as its client.
const EDGE = '192.0.2.10';

beforeEach(() => {
  process.env.ABUSE_LIMIT_HASH_SECRET = SIGNING_SECRET;
});

afterEach(() => {
  delete process.env.ABUSE_LIMIT_HASH_SECRET;
});

function headers(map: Record<string, string>): { get(name: string): string | null } {
  return { get: (name: string) => map[name.toLowerCase()] ?? null };
}

describe('extractClientInfo', () => {
  it('records the visitor the edge vouched for, not the edge the sign-in came through', async () => {
    const word = await vouchForVisitor(new Headers(), SIGNING_SECRET, '41.32.10.5');
    const info = extractClientInfo(headers({
      'x-nf-client-connection-ip': EDGE,
      [EDGE_VISITOR_HEADER]: word as string,
      'x-forwarded-for': '10.0.0.1, 41.32.10.5',
      'user-agent': 'Mozilla/5.0',
    }));
    expect(info).toEqual({ ip: '41.32.10.5', userAgent: 'Mozilla/5.0' });
  });

  it('records its own connection where the edge did not vouch', () => {
    const info = extractClientInfo(headers({ 'x-nf-client-connection-ip': '41.32.10.5', 'user-agent': 'Mozilla/5.0' }));
    expect(info).toEqual({ ip: '41.32.10.5', userAgent: 'Mozilla/5.0' });
  });

  it('never records a forwarding header a client can write', () => {
    const info = extractClientInfo(headers({ 'x-forwarded-for': '196.219.1.2, 10.0.0.1', 'x-real-ip': '196.219.1.3' }));
    expect(info.ip).toBe('unknown');
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
