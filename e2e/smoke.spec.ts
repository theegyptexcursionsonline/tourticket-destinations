import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads and shows title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('homepage has visible header', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('homepage has visible footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('admin login page loads', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Public API smoke tests', () => {
  test('GET /api/tours/public — returns JSON', async ({ request }) => {
    const response = await request.get('/api/tours/public');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('GET /api/destinations — returns JSON', async ({ request }) => {
    const response = await request.get('/api/destinations');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('GET /api/categories — returns JSON', async ({ request }) => {
    const response = await request.get('/api/categories');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /api/tenant/current — returns tenant config', async ({ request }) => {
    const response = await request.get('/api/tenant/current');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.tenant).toBeDefined();
    expect(body.tenant.name).toBeDefined();
  });

  test('GET /robots.txt — contains User-agent and Sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain('User-agent');
    expect(text).toContain('Sitemap');
  });
});

test.describe('Admin auth guard', () => {
  test('GET /api/admin/dashboard — rejects without auth', async ({ request }) => {
    const response = await request.get('/api/admin/dashboard');
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/admin/bookings — rejects without auth', async ({ request }) => {
    const response = await request.get('/api/admin/bookings');
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Navigation', () => {
  test('destinations page loads', async ({ page }) => {
    // First load may be slow due to on-demand compilation in dev
    test.setTimeout(60_000);
    await page.goto('/destinations', { timeout: 55_000 });
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('categories page loads', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/categories', { timeout: 55_000 });
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('body')).toBeVisible();
  });
});
