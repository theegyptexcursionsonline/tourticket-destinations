/**
 * @jest-environment node
 *
 * Request limits count the visitor the site's edge vouched for (lib/security/visitorAddress.ts),
 * never a forwarding header a client can rotate, and never the edge itself.
 */
import { NextRequest } from 'next/server';
import { EDGE_VISITOR_HEADER, vouchForVisitor } from '@/lib/security/visitorAddress';

const mockFindOneAndUpdate = jest.fn();
const mockFindOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockSendContactFormEmail = jest.fn();

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: jest.fn().mockResolvedValue('tenant-a'),
  buildStrictTenantQuery: (query: Record<string, unknown>) => query,
}));
jest.mock('@/lib/models/Blog', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
  },
}));
jest.mock('@/lib/mailgun', () => ({
  sendContactFormEmail: (...args: unknown[]) => mockSendContactFormEmail(...args),
}));

const SECRET = 'unit-test-visitor-limits-secret-at-least-32-chars';
// Behind the site's edge function, every API route sees the edge as its client.
const EDGE = '192.0.2.10';

async function visitorHeaders(peer: string, extra: Record<string, string> = {}) {
  const word = await vouchForVisitor(new Headers(), SECRET, peer);
  if (!word) throw new Error('the edge did not vouch');
  return { 'x-nf-client-connection-ip': EDGE, [EDGE_VISITOR_HEADER]: word, ...extra };
}

beforeEach(() => {
  process.env.ABUSE_LIMIT_HASH_SECRET = SECRET;
  delete process.env.RECAPTCHA_SECRET_KEY;
  mockFindOneAndUpdate.mockResolvedValue({ _id: 'blog-1' });
  mockFindOne.mockResolvedValue({ _id: 'blog-1' });
  mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  mockSendContactFormEmail.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ABUSE_LIMIT_HASH_SECRET;
});

describe('blog likes are limited per visitor', () => {
  async function like(headers: Record<string, string>) {
    const { POST } = await import('@/app/api/blog/[slug]/like/route');
    return POST(new NextRequest('https://hurghadaspeedboat.com/api/blog/a-post/like', { method: 'POST', headers }), {
      params: Promise.resolve({ slug: 'a-post' }),
    });
  }

  it('keeps counting a visitor who rotates X-Forwarded-For, and counts another visitor apart', async () => {
    for (let index = 0; index < 10; index += 1) {
      expect((await like(await visitorHeaders('198.51.100.20'))).status).toBe(200);
    }
    for (const forged of ['203.0.113.1', '203.0.113.2']) {
      const limited = await like(await visitorHeaders('198.51.100.20', { 'x-forwarded-for': forged, 'x-real-ip': forged }));
      expect(limited.status).toBe(429);
    }
    // Another visitor behind the same edge keeps their own allowance.
    expect((await like(await visitorHeaders('198.51.100.21'))).status).toBe(200);
  });
});

describe('contact submissions are limited per visitor', () => {
  async function submit(headers: Record<string, string>) {
    const { POST } = await import('@/app/api/contact/route');
    return POST(new NextRequest('https://hurghadaspeedboat.com/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ name: 'Test Visitor', email: 'visitor@example.com', message: 'Hello', submissionTime: 9000 }),
    }));
  }

  it('keeps counting a visitor who rotates X-Forwarded-For, and counts another visitor apart', async () => {
    for (let index = 0; index < 3; index += 1) {
      expect((await submit(await visitorHeaders('198.51.100.30'))).status).toBe(200);
    }
    for (const forged of ['203.0.113.3', '203.0.113.4']) {
      const limited = await submit(await visitorHeaders('198.51.100.30', { 'x-forwarded-for': forged, 'x-real-ip': forged }));
      expect(limited.status).toBe(429);
    }
    expect((await submit(await visitorHeaders('198.51.100.31'))).status).toBe(200);
    expect(mockSendContactFormEmail).toHaveBeenCalledTimes(4);
  });
});
