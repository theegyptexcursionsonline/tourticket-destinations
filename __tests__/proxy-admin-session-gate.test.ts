import { proxy } from '@/proxy';
import {
  ADMIN_SIGN_IN_PATH,
  hasPlausibleAdminSession,
  isAdminPagePath,
} from '@/lib/routing/adminSessionGate';

jest.mock('next/server', () => {
  const response = (status: number, values: Record<string, string>, body?: unknown) => ({
    status,
    headers: {
      get: (name: string) => values[name.toLowerCase()] ?? null,
      set: (name: string, value: string) => { values[name.toLowerCase()] = value; },
    },
    cookies: { set: () => undefined, delete: () => undefined },
    json: async () => body,
  });
  return {
    NextRequest: jest.fn(),
    NextResponse: {
      rewrite: (url: URL) => response(200, { 'x-middleware-rewrite': url.toString() }),
      redirect: (url: URL, status = 307) => response(status, { location: url.toString() }),
      next: () => response(200, { 'x-middleware-next': '1' }),
      json: (body: unknown, init?: { status?: number }) => response(init?.status ?? 200, {}, body),
    },
  };
});

jest.mock('next-intl/middleware', () => ({
  __esModule: true,
  default: () => jest.fn(() => ({
    status: 200,
    headers: { get: () => null, set: () => undefined },
    cookies: { set: () => undefined, delete: () => undefined },
  })),
}));

const base64Url = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function token(claims: Record<string, unknown>): string {
  return `${base64Url({ alg: 'HS256' })}.${base64Url(claims)}.c2lnbmF0dXJl`;
}

const NOW_S = Math.floor(Date.now() / 1000);
const adminSession = token({ sub: 'a'.repeat(24), scope: 'admin', exp: NOW_S + 3600 });
const enrollmentSession = token({ sub: 'a'.repeat(24), scope: 'admin-2fa-enrollment', exp: NOW_S + 900 });
const expiredSession = token({ sub: 'a'.repeat(24), scope: 'admin', exp: NOW_S - 1 });
const customerSession = token({ sub: 'c'.repeat(24), scope: 'customer', exp: NOW_S + 3600 });

const requestFor = (input: string, adminCookie?: string) => {
  const url = new URL(input) as URL & { clone: () => URL };
  url.clone = () => new URL(url.toString());
  return {
    headers: new Headers({ host: url.host }),
    cookies: {
      get: (name: string) =>
        name === 'admin-auth-token' && adminCookie !== undefined ? { value: adminCookie } : undefined,
    },
    nextUrl: url,
  } as never;
};

const rewriteOf = (response: { headers: { get: (name: string) => string | null } }) =>
  response.headers.get('x-middleware-rewrite');

describe('admin session gate — dashboard hosts', () => {
  it.each([
    'https://dashboard.egypt-excursionsonline.com/blog',
    'https://dashboard.egypt-excursionsonline.com/categories/000000000000000000000c12',
    'https://dashboard.egypt-excursionsonline.com/',
    'https://dashboard.egypt-excursionsonline.com/admin/blog',
    'https://dashboard2.egypt-excursionsonline.com/destinations',
    'https://admin.egypt-excursionsonline.com/tenants',
    'http://dashboard.localhost:3126/blog',
  ])('renders the data-free sign-in screen for an anonymous request: %s', async (input) => {
    const response = await proxy(requestFor(input));

    expect(rewriteOf(response)).toBe(`${new URL(input).origin}${ADMIN_SIGN_IN_PATH}`);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it.each([
    ['a junk cookie', 'not-a-token'],
    ['an empty cookie', ''],
    ['an expired admin session', expiredSession],
    ['a customer-scoped token', customerSession],
    ['a token with an unreadable payload', 'aaa.!!!.bbb'],
  ])('treats %s as signed out', async (_label, cookie) => {
    const response = await proxy(requestFor('https://dashboard.egypt-excursionsonline.com/blog', cookie));

    expect(rewriteOf(response)).toBe(`https://dashboard.egypt-excursionsonline.com${ADMIN_SIGN_IN_PATH}`);
  });

  it('renders the requested admin page for a plausible admin session', async () => {
    const response = await proxy(requestFor('https://dashboard.egypt-excursionsonline.com/blog', adminSession));

    expect(rewriteOf(response)).toBe('https://dashboard.egypt-excursionsonline.com/admin/blog');
    expect(response.headers.get('cache-control')).toBeNull();
  });

  it('lets a two-factor enrollment session reach the security page', async () => {
    const response = await proxy(requestFor('https://dashboard.egypt-excursionsonline.com/security', enrollmentSession));

    expect(rewriteOf(response)).toBe('https://dashboard.egypt-excursionsonline.com/admin/security');
  });

  it('passes /admin paths through for a plausible session', async () => {
    const response = await proxy(requestFor('https://dashboard.egypt-excursionsonline.com/admin/blog', adminSession));

    expect(rewriteOf(response)).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('serves the sign-in screen itself without a session', async () => {
    const response = await proxy(requestFor('https://dashboard.egypt-excursionsonline.com/sign-in'));

    expect(rewriteOf(response)).toBe(`https://dashboard.egypt-excursionsonline.com${ADMIN_SIGN_IN_PATH}`);
  });

  it.each([
    'https://dashboard.egypt-excursionsonline.com/api/admin/blog',
    'https://dashboard.egypt-excursionsonline.com/api/admin/login',
    'https://dashboard.egypt-excursionsonline.com/accept-invitation',
    'https://dashboard.egypt-excursionsonline.com/_next/data/build/x.json',
  ])('leaves APIs, invitations and runtime assets to their own handling: %s', async (input) => {
    const response = await proxy(requestFor(input));

    expect(rewriteOf(response) ?? '').not.toContain(ADMIN_SIGN_IN_PATH);
  });
});

describe('admin session gate — other hosts keep their routing', () => {
  it('still sends local admin links to the local dashboard host', async () => {
    const response = await proxy(requestFor('http://localhost:3126/admin/blog'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://dashboard.localhost:3126/blog');
  });

  it('still sends storefront /admin links to the dashboard host', async () => {
    const response = await proxy(requestFor('https://egypt-excursionsonline.com/admin/blog'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://dashboard.egypt-excursionsonline.com/blog');
  });

  it('still keeps admin off a brand domain', async () => {
    const response = await proxy(requestFor('https://hurghadaexcursionsonline.com/admin/blog'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://hurghadaexcursionsonline.com/');
  });
});

describe('hasPlausibleAdminSession', () => {
  it('accepts unexpired admin and enrollment sessions', async () => {
    expect(hasPlausibleAdminSession(adminSession)).toBe(true);
    expect(hasPlausibleAdminSession(enrollmentSession)).toBe(true);
  });

  it.each([
    ['missing', undefined],
    ['two segments', 'a.b'],
    ['expired', expiredSession],
    ['no expiry', token({ sub: 'x', scope: 'admin' })],
    ['no subject', token({ scope: 'admin', exp: NOW_S + 60 })],
    ['customer scope', customerSession],
    ['a non-JSON payload', `${base64Url({})}.${btoa('nope')}.sig`],
  ])('rejects a token that is %s', async (_label, value) => {
    expect(hasPlausibleAdminSession(value as string | undefined)).toBe(false);
  });

  it('only classifies /admin and its children as admin pages', async () => {
    expect(isAdminPagePath('/admin')).toBe(true);
    expect(isAdminPagePath('/admin/blog')).toBe(true);
    expect(isAdminPagePath('/administrator')).toBe(false);
    expect(isAdminPagePath('/api/admin/blog')).toBe(false);
  });
});
