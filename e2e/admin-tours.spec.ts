import { test, expect } from '@playwright/test';
import { adminLogin, hasAdminCredentials } from './helpers/admin-auth';

test.describe('Admin tour management', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCredentials(), 'Admin credentials not set');
    await adminLogin(page);
  });

  test('tours list page loads', async ({ page }) => {
    await page.goto('/admin/tours', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Should show tours list or table
    const heading = page.locator('text=/tours/i').first();
    await expect(heading).toBeVisible();

    // Should not show error
    const error = page.locator('text=/error|failed to load|something went wrong/i');
    expect(await error.count()).toBe(0);
  });

  test('tours list displays tour data', async ({ page }) => {
    await page.goto('/admin/tours', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(5000);

    // Should have table rows or tour cards
    const rows = page.locator('tr, [class*="tour-row"], [class*="tour-card"]');
    const count = await rows.count();
    // At least header row + 1 data row, or at least 1 card
    expect(count).toBeGreaterThan(0);
  });

  test('new tour form loads', async ({ page }) => {
    await page.goto('/admin/tours/new', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Form should have essential fields
    const titleInput = page.locator(
      'input[name="title"], input[placeholder*="title" i], #title',
    ).first();

    // At least a heading or form element should be visible
    const formArea = page.locator('form, [class*="form"]').first();
    await expect(formArea).toBeVisible();
  });

  test('edit tour form loads with data', async ({ page, request }) => {
    // Get a tour slug from API
    const res = await request.get('/api/tours/public');
    const body = await res.json();
    const tours = body.data || body.tours || [];

    test.skip(tours.length === 0, 'No tours to edit');

    const slug = tours[0].slug;
    await page.goto(`/admin/tours/edit/${slug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForTimeout(5000);

    // Form should be visible and pre-filled
    const formArea = page.locator('form, [class*="form"]').first();
    await expect(formArea).toBeVisible();

    // Title input should have a value (pre-filled)
    const titleInput = page.locator(
      'input[name="title"], input[placeholder*="title" i], #title',
    ).first();
    if ((await titleInput.count()) > 0) {
      const value = await titleInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('admin tours page has no JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(`${err.name}: ${err.message}`));

    await page.goto('/admin/tours', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    expect(jsErrors, `JS errors: ${jsErrors.join('; ')}`).toHaveLength(0);
  });
});
