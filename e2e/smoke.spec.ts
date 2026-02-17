import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads and shows heading', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('admin login page loads', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('body')).toBeVisible();
  });

  test('API health — tours endpoint returns JSON', async ({ request }) => {
    const response = await request.get('/api/tours');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('API health — destinations endpoint returns JSON', async ({ request }) => {
    const response = await request.get('/api/destinations');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('robots.txt is accessible', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain('User-agent');
  });
});
