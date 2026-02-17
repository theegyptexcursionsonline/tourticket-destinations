/**
 * @jest-environment node
 *
 * Supertest API integration tests.
 * Runs against a live Next.js dev/production server.
 *
 * Run:  pnpm test:api
 */
const supertest = require('supertest');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3002';
const request = supertest(BASE_URL);

describe('Public API Health Checks', () => {
  test('GET /api/tours/public — returns 200 with JSON', async () => {
    const res = await request
      .get('/api/tours/public')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(true);
  });

  test('GET /api/destinations — returns 200 with JSON', async () => {
    const res = await request
      .get('/api/destinations')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(true);
  });

  test('GET /api/categories — returns 200 with JSON', async () => {
    const res = await request
      .get('/api/categories')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/tenant/current — returns 200 with tenant config', async () => {
    const res = await request
      .get('/api/tenant/current')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tenant).toBeDefined();
    expect(res.body.tenant.tenantId).toBeDefined();
    expect(res.body.tenant.name).toBeDefined();
  });

  test('GET /robots.txt — returns 200 with User-agent directives', async () => {
    const res = await request
      .get('/robots.txt')
      .expect('Content-Type', /text/)
      .expect(200);
    expect(res.text).toContain('User-agent');
    expect(res.text).toContain('Sitemap');
  });
});

describe('Tour API', () => {
  test('GET /api/tours/public — returns array', async () => {
    const res = await request.get('/api/tours/public').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/tours/list — returns array', async () => {
    const res = await request.get('/api/tours/list').expect(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Destinations API', () => {
  test('GET /api/destinations — returns array', async () => {
    const res = await request.get('/api/destinations').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Admin API Auth Guard', () => {
  test('GET /api/admin/dashboard — 401/403 without auth', async () => {
    const res = await request.get('/api/admin/dashboard');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/reports — 401/403 without auth', async () => {
    const res = await request.get('/api/admin/reports');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/bookings — 401/403 without auth', async () => {
    const res = await request.get('/api/admin/bookings');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/tours — 401/403 without auth', async () => {
    const res = await request.get('/api/admin/tours');
    expect([401, 403]).toContain(res.status);
  });

  test('POST /api/admin/tours — 401/403 without auth', async () => {
    const res = await request.post('/api/admin/tours').send({ title: 'Test' });
    expect([401, 403]).toContain(res.status);
  });
});

describe('Contact & Subscribe', () => {
  test('POST /api/contact — does not 500 with empty body', async () => {
    const res = await request.post('/api/contact').send({});
    expect(res.status).toBeLessThan(500);
  });

  test('POST /api/subscribe — does not 500 with empty body', async () => {
    const res = await request.post('/api/subscribe').send({});
    expect(res.status).toBeLessThan(500);
  });
});

describe('Static Pages', () => {
  test('GET / — 200 homepage', async () => {
    const res = await request.get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('</html>');
  });

  test('GET /admin/login — responds (200 or redirect)', async () => {
    const res = await request.get('/admin/login');
    expect([200, 301, 302, 307, 308]).toContain(res.status);
  });
});
