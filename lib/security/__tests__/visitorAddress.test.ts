/**
 * @jest-environment node
 */
import {
  EDGE_VISITOR_HEADER,
  cleanAddress,
  fromCloudflare,
  limitKeyFor,
  parseAddress,
  visitorBehind,
  visitorSigningSecret,
  vouchForVisitor,
} from '@/lib/security/visitorAddress';
import { requestVisitor, vouchedVisitor } from '@/lib/security/requestVisitor';

const headers = (values: Record<string, string>) => new Headers(values);
const SECRET = 'unit-test-visitor-secret-at-least-32-characters';
const NOW = Date.UTC(2026, 9, 2, 12, 0, 0);
// The address Netlify gives a server function behind the edge function: the edge's own.
const EDGE = '192.0.2.10';

async function vouched(peer: string, values: Record<string, string> = {}, secret = SECRET, now = NOW) {
  const value = await vouchForVisitor(headers(values), secret, peer, now);
  expect(value).not.toBeNull();
  return value as string;
}

describe('the visitor behind a connection', () => {
  it('comes from Cloudflare when the connection really came through Cloudflare', () => {
    expect(visitorBehind('162.158.12.7', headers({ 'cf-connecting-ip': '198.51.100.7' })))
      .toEqual({ address: '198.51.100.7', via: 'cf' });
    expect(visitorBehind('2606:4700:10::ac43:2a4f', headers({ 'cf-connecting-ip': '2001:db8::7' })))
      .toEqual({ address: '2001:db8:0:0:0:0:0:7', via: 'cf' });
    // A Cloudflare edge written as IPv6 is still Cloudflare.
    expect(visitorBehind('::ffff:162.158.12.7', headers({ 'cf-connecting-ip': '198.51.100.7' })))
      .toEqual({ address: '198.51.100.7', via: 'cf' });
  });

  it('is the connection itself when someone calls the Netlify site directly with a forged header', () => {
    expect(visitorBehind('203.0.113.5', headers({ 'cf-connecting-ip': '192.0.2.1' })))
      .toEqual({ address: '203.0.113.5', via: 'peer' });
    expect(visitorBehind('203.0.113.5', headers({ 'x-forwarded-for': '192.0.2.1', 'x-real-ip': '192.0.2.2' })))
      .toEqual({ address: '203.0.113.5', via: 'peer' });
  });

  it("keeps the Cloudflare edge when Cloudflare's header is missing or not an address", () => {
    expect(visitorBehind('104.16.0.1', headers({}))).toEqual({ address: '104.16.0.1', via: 'peer' });
    expect(visitorBehind('104.16.0.1', headers({ 'cf-connecting-ip': 'everyone' })))
      .toEqual({ address: '104.16.0.1', via: 'peer' });
  });

  it('is unknown without a connection address', () => {
    expect(visitorBehind(null, headers({ 'cf-connecting-ip': '198.51.100.7' }))).toBeNull();
    expect(visitorBehind('not an address', headers({}))).toBeNull();
  });

  it('writes every address one way, and only as hex digits, colons and dots', () => {
    expect(cleanAddress(' ::ffff:198.51.100.7 ')).toBe('198.51.100.7');
    expect(cleanAddress('[2001:DB8::7]')).toBe('2001:db8:0:0:0:0:0:7');
    expect(cleanAddress('2001:0db8:0000::0007')).toBe('2001:db8:0:0:0:0:0:7');
    expect(cleanAddress('010.1.1.1')).toBe('10.1.1.1');
    for (const bad of ['fe80::1%eth0', '198.51.100.7;x', '198.51.100.7:443', '', '1.2.3']) {
      expect(cleanAddress(bad)).toBeNull();
    }
  });
});

describe('the key a limit counts a visitor by', () => {
  it('is an IPv4 address itself', () => {
    expect(limitKeyFor('198.51.100.7')).toBe('198.51.100.7');
    expect(limitKeyFor('::ffff:198.51.100.7')).toBe('198.51.100.7');
  });

  it('is the /64 of an IPv6 address, so one connection cannot rotate through its own network', () => {
    const key = limitKeyFor('2001:db8:4c7:1a00::9');
    expect(key).toBe('2001:db8:4c7:1a00:0:0:0:0/64');
    expect(limitKeyFor('2001:db8:4c7:1a00:ffff:ffff:ffff:ffff')).toBe(key);
    expect(limitKeyFor('2001:0db8:04c7:1a00:1::')).toBe(key);
    expect(limitKeyFor('2001:db8:4c7:1a01::9')).not.toBe(key);
  });

  it('is nothing for anything that is not an address', () => {
    expect(limitKeyFor('unknown')).toBeNull();
    expect(limitKeyFor(undefined)).toBeNull();
  });
});

describe("the edge's word for the visitor", () => {
  it('names the visitor it saw, and only a holder of the secret can write it', async () => {
    const throughCloudflare = await vouched('162.158.12.7', { 'cf-connecting-ip': '198.51.100.7' });
    expect(vouchedVisitor(throughCloudflare, SECRET, NOW)).toEqual({ address: '198.51.100.7', via: 'cf' });
    const direct = await vouched('2001:db8:4c7:1a00::9', { 'cf-connecting-ip': '192.0.2.1' });
    expect(vouchedVisitor(direct, SECRET, NOW)).toEqual({ address: '2001:db8:4c7:1a00:0:0:0:9', via: 'peer' });
    expect(vouchedVisitor(throughCloudflare, 'another-secret-also-at-least-32-characters', NOW)).toBeNull();
    // It names nothing but the visitor, its source and when.
    expect(throughCloudflare).not.toContain(SECRET);
    expect(throughCloudflare.split(';').slice(0, 4)).toEqual(['v1', String(NOW / 1000), 'cf', '198.51.100.7']);
  });

  it("can't be altered: another address, source or time breaks the signature", async () => {
    const value = await vouched('162.158.12.7', { 'cf-connecting-ip': '198.51.100.7' });
    const [version, issued, via, address, mac] = value.split(';');
    const altered = [
      [version, issued, via, '198.51.100.8', mac],
      [version, issued, 'peer', address, mac],
      [version, String(Number(issued) + 1), via, address, mac],
      [version, issued, via, address, `${mac?.slice(0, -1)}${mac?.endsWith('0') ? '1' : '0'}`],
    ];
    for (const parts of altered) expect(vouchedVisitor(parts.join(';'), SECRET, NOW)).toBeNull();
  });

  it('holds only for the request it came with', async () => {
    const value = await vouched('162.158.12.7', { 'cf-connecting-ip': '198.51.100.7' });
    expect(vouchedVisitor(value, SECRET, NOW + 300_000)).not.toBeNull();
    expect(vouchedVisitor(value, SECRET, NOW + 301_000)).toBeNull();
    expect(vouchedVisitor(value, SECRET, NOW - 61_000)).toBeNull();
  });

  it('is never written or believed without the secret or a connection', async () => {
    expect(await vouchForVisitor(headers({}), undefined, '162.158.12.7', NOW)).toBeNull();
    expect(await vouchForVisitor(headers({}), '', '162.158.12.7', NOW)).toBeNull();
    expect(await vouchForVisitor(headers({}), SECRET, null, NOW)).toBeNull();
    const value = await vouched('203.0.113.5');
    expect(vouchedVisitor(value, undefined, NOW)).toBeNull();
    for (const malformed of ['', 'v1', 'v2;1;cf;198.51.100.7;00', `v1;${NOW / 1000};cf;everyone;${'0'.repeat(64)}`,
      `v1;${NOW / 1000};x;198.51.100.7;${'0'.repeat(64)}`, `v1;${NOW / 1000};cf;198.51.100.7;zz`,
      `v1;${NOW / 1000};cf;2001:db8::7;${'0'.repeat(64)}`, 'x'.repeat(300)]) {
      expect(vouchedVisitor(malformed, SECRET, NOW)).toBeNull();
    }
  });

  it('is not written when signing throws', async () => {
    const sign = jest.spyOn(crypto.subtle, 'sign').mockRejectedValueOnce(new Error('engine unavailable'));
    expect(await vouchForVisitor(headers({}), SECRET, '203.0.113.5', NOW)).toBeNull();
    sign.mockRestore();
  });
});

describe("the visitor's address in a server function", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it('is the visitor the edge vouched for, not the edge it connected through', async () => {
    // Behind the edge function, x-nf-client-connection-ip is the edge's own address, the
    // same for every visitor it serves.
    const word = await vouched('162.158.12.7', { 'cf-connecting-ip': '198.51.100.7' });
    const request = headers({ 'x-nf-client-connection-ip': EDGE, [EDGE_VISITOR_HEADER]: word });
    expect(requestVisitor(request, SECRET, NOW)).toEqual({ address: '198.51.100.7', source: 'cf' });
    const direct = await vouched('203.0.113.5', { 'cf-connecting-ip': '192.0.2.1' });
    expect(requestVisitor(headers({ 'x-nf-client-connection-ip': EDGE, [EDGE_VISITOR_HEADER]: direct }), SECRET, NOW))
      .toEqual({ address: '203.0.113.5', source: 'peer' });
  });

  it('ignores a word the edge did not write, says it fell back, and logs without the value', async () => {
    const forged = await vouched('162.158.12.7', { 'cf-connecting-ip': '198.51.100.66' }, 'guessed-secret-that-is-also-32-chars-long');
    const request = headers({
      'x-nf-client-connection-ip': EDGE,
      [EDGE_VISITOR_HEADER]: forged,
      'cf-connecting-ip': '198.51.100.66',
      'x-forwarded-for': '198.51.100.67',
    });
    expect(requestVisitor(request, SECRET, NOW)).toEqual({ address: EDGE, source: 'origin-peer' });
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('198.51.100.66');
    // Without the secret no word is believed at all.
    const word = await vouched('203.0.113.5');
    expect(requestVisitor(headers({ 'x-nf-client-connection-ip': EDGE, [EDGE_VISITOR_HEADER]: word }), undefined, NOW))
      .toEqual({ address: EDGE, source: 'origin-peer' });
  });

  it('reads its own connection where the edge did not run', () => {
    expect(requestVisitor(headers({ 'x-nf-client-connection-ip': '162.158.12.7', 'cf-connecting-ip': '198.51.100.7' }), SECRET, NOW))
      .toEqual({ address: '198.51.100.7', source: 'origin-cf' });
    expect(requestVisitor(headers({ 'x-nf-client-connection-ip': '203.0.113.5', 'cf-connecting-ip': '192.0.2.1' }), SECRET, NOW))
      .toEqual({ address: '203.0.113.5', source: 'origin-peer' });
  });

  it('is unknown without any reading (a local run), and never reads forwarding headers', () => {
    expect(requestVisitor(headers({ 'cf-connecting-ip': '198.51.100.7' }), SECRET, NOW)).toBeNull();
    expect(requestVisitor(headers({ 'x-forwarded-for': '198.51.100.7', 'x-real-ip': '198.51.100.8' }), SECRET, NOW)).toBeNull();
    expect(requestVisitor(headers({ 'x-nf-client-connection-ip': 'not an address' }), SECRET, NOW)).toBeNull();
  });
});

describe('the signing secret', () => {
  it('is the abuse-limit secret, else JWT_SECRET, and only when long enough', () => {
    const long = 'a'.repeat(32);
    const other = 'b'.repeat(40);
    expect(visitorSigningSecret({ ABUSE_LIMIT_HASH_SECRET: long, JWT_SECRET: other })).toBe(long);
    expect(visitorSigningSecret({ JWT_SECRET: other })).toBe(other);
    expect(visitorSigningSecret({ JWT_SECRET: 'short' })).toBeUndefined();
    expect(visitorSigningSecret({})).toBeUndefined();
  });
});

describe('addresses and ranges', () => {
  it('reads IPv4 and IPv6, including compressed and embedded forms', () => {
    expect(parseAddress('10.0.0.1')?.bytes).toEqual([10, 0, 0, 1]);
    expect(parseAddress('::ffff:1.2.3.4')?.bytes).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 1, 2, 3, 4]);
    expect(parseAddress('2606:4700::1')?.bytes).toEqual([0x26, 0x06, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(parseAddress('[2606:4700::1]')?.version).toBe(6);
    for (const bad of ['1.2.3', '1.2.3.256', '1::2::3', '12345::', 'x.y.z.w', '']) {
      expect(parseAddress(bad)).toBeNull();
    }
  });

  it("knows Cloudflare's edges and nobody else's", () => {
    expect(fromCloudflare('173.245.48.1')).toBe(true);
    expect(fromCloudflare('131.0.75.255')).toBe(true);
    expect(fromCloudflare('2a06:98c7:ffff::1')).toBe(true);
    expect(fromCloudflare('131.0.76.0')).toBe(false);
    expect(fromCloudflare('203.0.113.5')).toBe(false);
    expect(fromCloudflare('2001:db8::1')).toBe(false);
  });
});
