import { proxy } from '@/proxy';

jest.mock('next/server', () => {
  // The network proxy also stamps tenant headers and cookies on the response.
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
      next: () => response(200, {}),
      json: (body: unknown, init?: { status?: number }) => response(init?.status ?? 200, {}, body),
    },
  };
});

jest.mock('next-intl/middleware', () => ({
  __esModule: true,
  default: () => jest.fn(),
}));

const requestFor = (input: string, internalUrl = input) => {
  const requestedUrl = new URL(input);
  const url = new URL(internalUrl) as URL & { clone: () => URL };
  url.clone = () => new URL(url.toString());
  return {
    headers: { get: (name: string) => name.toLowerCase() === 'host' ? requestedUrl.host : null },
    // The network proxy also resolves the tenant from cookies; none are set here.
    cookies: { get: () => undefined },
    nextUrl: url,
  } as never;
};

describe('dashboard tour routes', () => {
  it('rewrites /tours/new to the admin creation page without treating new as a public slug', () => {
    const response = proxy(requestFor('https://dashboard2.egypt-excursionsonline.com/tours/new'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://dashboard2.egypt-excursionsonline.com/admin/tours/new',
    );
  });

  it('keeps redirecting legacy storefront tour links to their canonical root URL', () => {
    const response = proxy(requestFor('https://egypt-excursionsonline.com/tours/example-tour'));

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://egypt-excursionsonline.com/example-tour');
  });

  it('keeps local admin navigation on the same local server and preserves the query', () => {
    const response = proxy(requestFor('http://localhost:3126/admin?next=%2Fadmin%2Fdestinations'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://dashboard.localhost:3126/?next=%2Fadmin%2Fdestinations',
    );
  });

  it('normalizes an IPv4 loopback admin URL to the local dashboard host', () => {
    const response = proxy(requestFor('http://127.0.0.1:3126/admin/destinations?tenantId=brand-one'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://dashboard.localhost:3126/destinations?tenantId=brand-one',
    );
  });

  it('serves dashboard.localhost inside the local app without a cross-origin redirect', () => {
    const response = proxy(requestFor('http://dashboard.localhost:3126/login?next=%2Fadmin'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://dashboard.localhost:3126/admin/login?next=%2Fadmin',
    );
  });

  it('preserves the canonical production storefront-to-dashboard redirect', () => {
    const response = proxy(requestFor(
      'https://www.egypt-excursionsonline.com/admin/destinations?tenantId=brand-one',
    ));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://dashboard.egypt-excursionsonline.com/destinations?tenantId=brand-one',
    );
  });

  it.each([
    'https://unknown.example/admin/login',
    'https://main--egyptexcursions.netlify.app/admin/login',
    'https://dashboard.attacker.example/admin/login',
  ])('fails closed on an unapproved admin host: %s', async (input) => {
    const response = proxy(requestFor(input));

    expect(response.status).toBe(403);
    expect(response.headers.get('location')).toBeNull();
    await expect(response.json()).resolves.toEqual({
      error: 'Admin access is not available on this host. Use the configured dashboard host.',
    });
  });

  it('uses the validated Host authority when a reverse proxy exposes an internal loopback URL', () => {
    const response = proxy(requestFor(
      'https://unknown.example/admin/login',
      'http://127.0.0.1:3126/admin/login',
    ));

    expect(response.status).toBe(403);
    expect(response.headers.get('location')).toBeNull();
  });

  it('does not redirect a local admin API request to a page or production origin', () => {
    const response = proxy(requestFor('http://localhost:3126/api/admin/login'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
