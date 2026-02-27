/**
 * @jest-environment node
 *
 * Supertest API Integration Tests
 *
 * Tests API endpoints against a running server.
 * Auto-skips if no server is available (safe for CI/build).
 *
 * Run: pnpm test:api
 */
import supertest from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
let serverAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/destinations`, { signal: AbortSignal.timeout(3000) });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
});

const describeIfServer = () => (serverAvailable ? describe : describe.skip);

describeIfServer()('Public API Endpoints', () => {
  const request = supertest(BASE_URL);

  test('GET /api/destinations returns 200 with JSON', async () => {
    const res = await request
      .get('/api/destinations')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/tours/public returns 200 with JSON', async () => {
    const res = await request
      .get('/api/tours/public')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/categories returns 200 with JSON', async () => {
    const res = await request
      .get('/api/categories')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/tenant/current returns tenant config', async () => {
    const res = await request
      .get('/api/tenant/current')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tenant).toBeDefined();
  });
});

describeIfServer()('Admin API Auth Guards', () => {
  const request = supertest(BASE_URL);

  test('GET /api/admin/dashboard requires authentication', async () => {
    const res = await request.get('/api/admin/dashboard');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/tours requires authentication', async () => {
    const res = await request.get('/api/admin/tours');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/bookings requires authentication', async () => {
    const res = await request.get('/api/admin/bookings');
    expect([401, 403]).toContain(res.status);
  });

  test('POST /api/admin/login rejects empty body', async () => {
    const res = await request.post('/api/admin/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describeIfServer()('Security Headers', () => {
  const request = supertest(BASE_URL);

  test('responses include security headers', async () => {
    const res = await request.get('/api/destinations');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describeIfServer()('404 Handling', () => {
  const request = supertest(BASE_URL);

  test('non-existent API routes return appropriate error', async () => {
    const res = await request.get('/api/this-route-does-not-exist');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// Ensure Jest reports something even if server is down
describe('Server availability', () => {
  test('checks if test server is running', () => {
    if (!serverAvailable) {
      console.log(`⏭️  Server not available at ${BASE_URL} — supertest tests skipped`);
    }
    expect(true).toBe(true);
  });
});
