/**
 * @jest-environment node
 *
 * Supertest API integration tests.
 *
 * These tests make real HTTP requests against the running Next.js server.
 * The server must be running before executing these tests.
 *
 * Run:  pnpm test:api
 */
import supertest from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const request = supertest(BASE_URL);

describe('API Health Checks (Supertest)', () => {
  test('GET /api/tours — returns 200 with JSON', async () => {
    const res = await request
      .get('/api/tours')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toBeDefined();
  });

  test('GET /api/destinations — returns 200 with JSON', async () => {
    const res = await request
      .get('/api/destinations')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toBeDefined();
  });

  test('GET /api/categories — returns 200 with JSON', async () => {
    const res = await request
      .get('/api/categories')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toBeDefined();
  });

  test('GET /api/tenant/current — returns 200 with tenant config', async () => {
    const res = await request
      .get('/api/tenant/current')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toBeDefined();
  });

  test('GET /robots.txt — returns 200 with text', async () => {
    const res = await request
      .get('/robots.txt')
      .expect('Content-Type', /text/)
      .expect(200);

    expect(res.text).toContain('User-agent');
  });

  test('GET /api/admin/dashboard — returns 401 without auth', async () => {
    const res = await request.get('/api/admin/dashboard');

    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/reports — returns 401 without auth', async () => {
    const res = await request.get('/api/admin/reports');

    expect([401, 403]).toContain(res.status);
  });
});
