import { test, expect } from '@playwright/test';

test.describe('Security headers', () => {
  test('sets X-Frame-Options: DENY', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['x-frame-options']).toBe('DENY');
  });

  test('sets X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('does not expose X-Powered-By', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['x-powered-by']).toBeUndefined();
  });

  test('sets Referrer-Policy', async ({ request }) => {
    const res = await request.get('/');
    const referrerPolicy = res.headers()['referrer-policy'];
    expect(referrerPolicy).toBeDefined();
    expect(referrerPolicy).toContain('origin');
  });

  test('API routes have no-store cache headers', async ({ request }) => {
    const res = await request.get('/api/tours/public');
    const cacheControl = res.headers()['cache-control'] || '';
    expect(cacheControl).toContain('no-store');
  });
});

test.describe('Admin route protection', () => {
  const adminApiRoutes = [
    '/api/admin/dashboard',
    '/api/admin/bookings',
    '/api/admin/tours',
    '/api/admin/destinations',
    '/api/admin/users',
    '/api/admin/reviews',
    '/api/admin/team',
    '/api/admin/special-offers',
    '/api/admin/discounts',
    '/api/admin/hero-settings',
    '/api/admin/blog',
    '/api/admin/availability',
    '/api/admin/reports',
    '/api/admin/categories',
    '/api/admin/tenants',
    '/api/admin/manifests',
  ];

  for (const route of adminApiRoutes) {
    test(`${route} — blocks unauthenticated access`, async ({ request }) => {
      const res = await request.get(route);
      expect(
        [401, 403].includes(res.status()),
        `${route} returned ${res.status()} (expected 401/403)`,
      ).toBeTruthy();
    });
  }

  test('admin write operations blocked without auth', async ({ request }) => {
    // POST to create tour
    const tourRes = await request.post('/api/admin/tours', {
      data: { title: 'Unauthorized Tour' },
    });
    expect([401, 403]).toContain(tourRes.status());

    // POST to create booking
    const bookingRes = await request.post('/api/admin/bookings', {
      data: { tour: 'fake-id' },
    });
    expect([401, 403]).toContain(bookingRes.status());

    // DELETE attempts
    const deleteRes = await request.delete('/api/admin/tours/fake-id');
    expect([401, 403, 404]).toContain(deleteRes.status());
  });

  test('admin login does not leak sensitive info on error', async ({ request }) => {
    const res = await request.post('/api/admin/login', {
      data: { email: 'fake@test.com', password: 'wrong' },
    });

    const body = await res.json();
    const bodyStr = JSON.stringify(body);

    // Should not contain stack traces, env vars, or internal details
    expect(bodyStr).not.toContain('stack');
    expect(bodyStr).not.toContain('MONGODB_URI');
    expect(bodyStr).not.toContain('JWT_SECRET');
    expect(bodyStr).not.toContain('process.env');
  });
});

test.describe('Admin page access', () => {
  test('admin pages redirect or show login when not authenticated', async ({ page }) => {
    const adminPages = [
      '/admin/tours',
      '/admin/bookings',
      '/admin/destinations',
      '/admin/hero-settings',
    ];

    for (const adminPage of adminPages) {
      await page.goto(adminPage, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Should either redirect to login or show login form
      const loginForm = page.locator('#email, input[name="email"]');
      const isOnLogin = page.url().includes('admin') && (await loginForm.count()) > 0;
      const redirectedToLogin = page.url().includes('login');

      expect(
        isOnLogin || redirectedToLogin,
        `${adminPage} should require authentication`,
      ).toBeTruthy();
    }
  });
});

test.describe('404 handling', () => {
  test('non-existent page returns 404', async ({ request }) => {
    const res = await request.get('/this-page-does-not-exist-12345');
    expect(res.status()).toBe(404);
  });

  test('non-existent API route returns 404', async ({ request }) => {
    const res = await request.get('/api/nonexistent-route-12345');
    expect(res.status()).toBe(404);
  });
});
