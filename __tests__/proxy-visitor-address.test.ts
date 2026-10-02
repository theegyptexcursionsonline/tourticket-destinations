/**
 * @jest-environment node
 *
 * The proxy runs as Netlify's edge function, the only place that still sees the visitor's
 * connection. Every request it passes on to the server must carry its signed word for the
 * visitor (lib/security/visitorAddress.ts), and never a copy the request arrived with.
 */
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { EDGE_VISITOR_HEADER } from '@/lib/security/visitorAddress';
import { vouchedVisitor } from '@/lib/security/requestVisitor';

// next-intl ships ESM that this Jest setup does not transform. This stand-in does exactly
// what next-intl 4's pass-through does (dist/esm/development/middleware/middleware.js,
// next()): forward a copy of the headers of the request it is given, plus its locale header.
jest.mock('next-intl/middleware', () => {
  const { NextResponse } = jest.requireActual('next/server');
  return {
    __esModule: true,
    default: () => (incoming: NextRequest) => {
      const headers = new Headers(incoming.headers);
      headers.set('X-NEXT-INTL-LOCALE', incoming.nextUrl.pathname.split('/')[1] || 'de');
      return NextResponse.next({ request: { headers } });
    },
  };
});

const SECRET = 'unit-test-proxy-visitor-secret-at-least-32-chars';
const CLOUDFLARE_EDGE = '162.158.12.7';
const BRAND = 'hurghadaspeedboat.com';
const CLOUDFLARE_HOST = 'dashboard.egypt-excursionsonline.com';

type NetlifyGlobal = { Netlify?: { context?: { ip?: string } } };

function onNetlifyEdge(ip: string) {
  (globalThis as NetlifyGlobal).Netlify = { context: { ip } };
}

const forwardedWord = (response: Response) => response.headers.get(`x-middleware-request-${EDGE_VISITOR_HEADER}`);
const forwardedNames = (response: Response) =>
  (response.headers.get('x-middleware-override-headers') || '').split(',').filter(Boolean);

function request(url: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  // As Netlify hands it over: the Host header names the site requested.
  const headers = { host: new URL(url).host, 'user-agent': 'Mozilla/5.0 (test)', ...init.headers };
  return new NextRequest(url, { method: init.method || 'GET', headers });
}

describe('the edge vouches for the visitor on every request it passes on', () => {
  let error: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    process.env.ABUSE_LIMIT_HASH_SECRET = SECRET;
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.ABUSE_LIMIT_HASH_SECRET;
    delete (globalThis as NetlifyGlobal).Netlify;
    error.mockRestore();
    warn.mockRestore();
  });

  it('names the visitor on an API request, with the tenant headers', async () => {
    onNetlifyEdge('203.0.113.5');
    const response = await proxy(request(`https://${BRAND}/api/checkout/create-payment-intent`, {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.7', 'x-forwarded-for': '198.51.100.8' },
    }));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    // A forged Cloudflare header on a direct connection is not believed.
    expect(vouchedVisitor(forwardedWord(response), SECRET)).toEqual({ address: '203.0.113.5', via: 'peer' });
    expect(response.headers.get('x-middleware-request-x-tenant-domain')).toBe(BRAND);
  });

  it("names the visitor behind Cloudflare from Cloudflare's own header", async () => {
    onNetlifyEdge(CLOUDFLARE_EDGE);
    const response = await proxy(request(`https://${CLOUDFLARE_HOST}/api/contact`, {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.7' },
    }));

    expect(vouchedVisitor(forwardedWord(response), SECRET)).toEqual({ address: '198.51.100.7', via: 'cf' });
  });

  it('replaces a word the request arrived with, on API and page requests', async () => {
    onNetlifyEdge('203.0.113.5');
    const forged = `v1;${Math.floor(Date.now() / 1000)};peer;198.51.100.66;${'0'.repeat(64)}`;
    for (const path of ['/api/contact', '/de/kontakt']) {
      const response = await proxy(request(`https://${BRAND}${path}`, { headers: { [EDGE_VISITOR_HEADER]: forged } }));
      expect(forwardedWord(response)).not.toBe(forged);
      expect(vouchedVisitor(forwardedWord(response), SECRET)).toEqual({ address: '203.0.113.5', via: 'peer' });
    }
  });

  it('vouches on storefront pages routed through the locale middleware, beside the tenant headers', async () => {
    onNetlifyEdge('203.0.113.5');
    const response = await proxy(request(`https://${BRAND}/de/kontakt`));

    expect(vouchedVisitor(forwardedWord(response), SECRET)).toEqual({ address: '203.0.113.5', via: 'peer' });
    expect(forwardedNames(response)).toEqual(expect.arrayContaining([EDGE_VISITOR_HEADER, 'x-tenant-id', 'x-next-intl-locale']));
  });

  it('forwards no word at all without the secret, dropping the copy, and says so once', async () => {
    delete process.env.ABUSE_LIMIT_HASH_SECRET;
    const jwt = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      onNetlifyEdge('203.0.113.5');
      const forged = `v1;${Math.floor(Date.now() / 1000)};peer;198.51.100.66;${'0'.repeat(64)}`;
      const api = await proxy(request(`https://${BRAND}/api/contact`, { method: 'POST', headers: { [EDGE_VISITOR_HEADER]: forged } }));
      const page = await proxy(request(`https://${BRAND}/de/kontakt`, { headers: { [EDGE_VISITOR_HEADER]: forged } }));

      for (const response of [api, page]) {
        expect(forwardedWord(response)).toBeNull();
        expect(forwardedNames(response)).not.toContain(EDGE_VISITOR_HEADER);
        expect(forwardedNames(response).length).toBeGreaterThan(0);
      }
      const messages = error.mock.calls.map((call) => String(call[0]));
      expect(messages.filter((message) => message.includes('cannot vouch'))).toHaveLength(1);
      expect(messages.join('\n')).not.toContain('203.0.113.5');
    } finally {
      if (jwt !== undefined) process.env.JWT_SECRET = jwt;
    }
  });

  it('forwards nothing on a redirect, which never reaches the server', async () => {
    onNetlifyEdge('203.0.113.5');
    const response = await proxy(request(`https://${BRAND}/tours/example-tour`));

    expect(response.status).toBe(308);
    expect(forwardedWord(response)).toBeNull();
  });

  it('runs off Netlify (a local run) without a word or a warning', async () => {
    const response = await proxy(request('http://localhost:3000/api/contact', { method: 'POST' }));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(forwardedWord(response)).toBeNull();
    expect(error).not.toHaveBeenCalled();
  });
});
