/**
 * @jest-environment node
 */
jest.mock('@/lib/models/AbuseRateLimit', () => ({
  __esModule: true,
  default: { findOneAndUpdate: jest.fn() },
}));

import {
  consumeAbuseLimit,
  extractTrustedClientAddress,
  hashPrivacyKey,
  publicRequestIdentity,
  type AbuseLimitBucket,
  type AbuseLimitStore,
} from '@/lib/security/distributedAbuseLimit';
import { EDGE_VISITOR_HEADER, vouchForVisitor } from '@/lib/security/visitorAddress';

const SIGNING_SECRET = 'unit-test-secret-that-is-definitely-at-least-32-bytes';
// Behind the site's edge function, every API route sees the edge as its client.
const EDGE_A = '192.0.2.10';
const EDGE_B = '192.0.2.11';
const BROWSER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';

/** A request as an API route receives it behind the edge: the edge's own connection address,
 *  and (when the edge vouched) its signed word for the visitor it saw. */
async function behindEdge(
  edge: string,
  visitor: { peer: string; headers?: Record<string, string> } | null,
  extra: Record<string, string> = {},
): Promise<Request> {
  const values: Record<string, string> = { 'x-nf-client-connection-ip': edge, 'user-agent': BROWSER, ...extra };
  if (visitor) {
    const word = await vouchForVisitor(new Headers(visitor.headers || {}), SIGNING_SECRET, visitor.peer);
    if (!word) throw new Error('the edge did not vouch');
    values[EDGE_VISITOR_HEADER] = word;
  }
  return { headers: new Headers(values) } as Request;
}

class AtomicMemoryStore implements AbuseLimitStore {
  private counts = new Map<string, number>();

  async increment(bucket: AbuseLimitBucket): Promise<number> {
    const key = `${bucket.scope}:${bucket.keyHash}:${bucket.windowStart.toISOString()}`;
    const next = (this.counts.get(key) || 0) + 1;
    this.counts.set(key, next);
    return next;
  }
}

describe('distributed public-action abuse limits', () => {
  beforeEach(() => {
    process.env.ABUSE_LIMIT_HASH_SECRET = SIGNING_SECRET;
  });

  afterEach(() => {
    delete process.env.ABUSE_LIMIT_HASH_SECRET;
  });

  it('allows only the configured number under concurrent requests', async () => {
    const store = new AtomicMemoryStore();
    const results = await Promise.all(
      Array.from({ length: 100 }, () => consumeAbuseLimit({
        scope: 'contact-form:subject',
        identity: 'traveller@example.com',
        limit: 7,
        windowMs: 60_000,
        now: new Date('2026-07-13T10:00:05.000Z'),
      }, store)),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(7);
    expect(Math.max(...results.map((result) => result.count))).toBe(100);
  });

  it('uses distinct fixed windows and returns a bounded retry time', async () => {
    const store = new AtomicMemoryStore();
    const first = await consumeAbuseLimit({
      scope: 'newsletter-subscribe:subject',
      identity: 'same@example.com',
      limit: 1,
      windowMs: 60_000,
      now: new Date('2026-07-13T10:00:59.500Z'),
    }, store);
    const denied = await consumeAbuseLimit({
      scope: 'newsletter-subscribe:subject',
      identity: 'same@example.com',
      limit: 1,
      windowMs: 60_000,
      now: new Date('2026-07-13T10:00:59.600Z'),
    }, store);
    const nextWindow = await consumeAbuseLimit({
      scope: 'newsletter-subscribe:subject',
      identity: 'same@example.com',
      limit: 1,
      windowMs: 60_000,
      now: new Date('2026-07-13T10:01:00.000Z'),
    }, store);

    expect(first.allowed).toBe(true);
    expect(denied).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    expect(nextWindow).toMatchObject({ allowed: true, count: 1 });
  });

  it('stores only one-way purpose-bound identity hashes', () => {
    const subject = '203.0.113.50|traveller@example.com';
    const first = hashPrivacyKey(subject, 'login');
    const secondPurpose = hashPrivacyKey(subject, 'contact');

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain('203.0.113.50');
    expect(first).not.toContain('traveller@example.com');
    expect(first).not.toBe(secondPurpose);
  });

  it('counts each visitor the edge vouched for as themselves, not as the edge serving them', async () => {
    // Two visitors served by one edge instance used to share one key (the edge's address).
    const first = await behindEdge(EDGE_A, { peer: '198.51.100.7' });
    const second = await behindEdge(EDGE_A, { peer: '203.0.113.9' });
    expect(extractTrustedClientAddress(first)).toBe('198.51.100.7');
    expect(extractTrustedClientAddress(second)).toBe('203.0.113.9');
    expect(publicRequestIdentity(first)).not.toBe(publicRequestIdentity(second));

    // One visitor served by two edge instances used to spread over two keys.
    const again = await behindEdge(EDGE_B, { peer: '198.51.100.7' });
    expect(publicRequestIdentity(again)).toBe(publicRequestIdentity(first));
  });

  it("counts a visitor through Cloudflare by Cloudflare's word only when Cloudflare connected", async () => {
    const throughCloudflare = await behindEdge(EDGE_A, {
      peer: '162.158.12.7',
      headers: { 'cf-connecting-ip': '198.51.100.7' },
    });
    const forgedDirect = await behindEdge(EDGE_A, {
      peer: '203.0.113.9',
      headers: { 'cf-connecting-ip': '198.51.100.7' },
    });
    expect(extractTrustedClientAddress(throughCloudflare)).toBe('198.51.100.7');
    expect(extractTrustedClientAddress(forgedDirect)).toBe('203.0.113.9');
  });

  it('never believes an unsigned word or a forwarding header a client can choose', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const forged = await behindEdge(EDGE_A, null, {
      [EDGE_VISITOR_HEADER]: `v1;${Math.floor(Date.now() / 1000)};peer;198.51.100.66;${'0'.repeat(64)}`,
      'x-forwarded-for': '198.51.100.10',
      'x-real-ip': '198.51.100.11',
    });
    // Unvouched, the route counts its own connection: behind the edge, the edge.
    expect(extractTrustedClientAddress(forged)).toBe(EDGE_A);
    expect(publicRequestIdentity(forged)).not.toContain('198.51.100');
    warn.mockRestore();

    const spoofed = { headers: new Headers({ 'x-forwarded-for': '198.51.100.10', 'x-real-ip': '198.51.100.11' }) } as Request;
    expect(extractTrustedClientAddress(spoofed)).toBeNull();
    expect(publicRequestIdentity(spoofed)).toBe('network:unavailable|agent:unavailable');
  });

  it('counts an IPv6 visitor by their /64, so rotating through their own network gains nothing', async () => {
    const one = await behindEdge(EDGE_A, { peer: '2001:db8:4c7:1a00::9' });
    const rotated = await behindEdge(EDGE_B, { peer: '2001:db8:4c7:1a00:ffff:1:2:3' });
    const neighbour = await behindEdge(EDGE_A, { peer: '2001:db8:4c7:1a01::9' });
    expect(publicRequestIdentity(one)).toBe(publicRequestIdentity(rotated));
    expect(publicRequestIdentity(one)).not.toBe(publicRequestIdentity(neighbour));
    // The audit-grade address stays exact.
    expect(extractTrustedClientAddress(rotated)).toBe('2001:db8:4c7:1a00:ffff:1:2:3');
  });
});
