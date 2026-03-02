import { test, expect } from '@playwright/test';

test.describe('Public API health checks', () => {
  const publicGetEndpoints = [
    '/api/tours/public',
    '/api/destinations',
    '/api/categories',
    '/api/tenant/current',
    '/api/hero-settings',
    '/api/blog',
    '/api/interests',
    '/api/careers',
  ];

  for (const endpoint of publicGetEndpoints) {
    test(`GET ${endpoint} — returns 2xx JSON`, async ({ request }) => {
      const res = await request.get(endpoint, { timeout: 10_000 });
      expect(res.ok(), `${endpoint} returned ${res.status()}`).toBeTruthy();

      const contentType = res.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');

      const body = await res.json();
      expect(body.success).toBe(true);
    });
  }

  test('GET /api/search/tours?q=tour — returns results', async ({ request }) => {
    const res = await request.get('/api/search/tours?q=tour');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /api/search/live?q=cairo — returns results', async ({ request }) => {
    const res = await request.get('/api/search/live?q=cairo');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('POST /api/subscribe — accepts valid email', async ({ request }) => {
    const res = await request.post('/api/subscribe', {
      data: { email: 'e2e-test@example.com' },
    });
    // Accept 200 or 201 or even 409 (already subscribed)
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/contact — validates required fields', async ({ request }) => {
    const res = await request.post('/api/contact', {
      data: {},
    });
    // Should return 400 for missing fields, not 500
    expect(res.status()).toBeLessThan(500);
    expect([400, 422, 429]).toContain(res.status());
  });
});

test.describe('Admin API auth guards', () => {
  const protectedEndpoints = [
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
  ];

  for (const endpoint of protectedEndpoints) {
    test(`GET ${endpoint} — rejects without auth`, async ({ request }) => {
      const res = await request.get(endpoint);
      expect(
        [401, 403].includes(res.status()),
        `${endpoint} returned ${res.status()} — expected 401 or 403`,
      ).toBeTruthy();
    });
  }

  test('POST /api/admin/login — rejects empty body', async ({ request }) => {
    const res = await request.post('/api/admin/login', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('POST /api/admin/login — rejects invalid credentials', async ({ request }) => {
    const res = await request.post('/api/admin/login', {
      data: { email: 'fake@test.com', password: 'wrong' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
