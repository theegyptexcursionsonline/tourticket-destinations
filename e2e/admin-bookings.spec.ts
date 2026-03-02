import { test, expect } from '@playwright/test';
import { adminLogin, hasAdminCredentials } from './helpers/admin-auth';

test.describe('Admin bookings', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCredentials(), 'Admin credentials not set');
    await adminLogin(page);
  });

  test('bookings list page loads', async ({ page }) => {
    await page.goto('/admin/bookings', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    const heading = page.locator('text=/bookings/i').first();
    await expect(heading).toBeVisible();

    // Should not show error state
    const error = page.locator('text=/error|failed to load|something went wrong/i');
    expect(await error.count()).toBe(0);
  });

  test('bookings list shows table or cards', async ({ page }) => {
    await page.goto('/admin/bookings', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(5000);

    // Should have table headers or booking cards, or "no bookings" message
    const tableHeaders = page.locator('th, [class*="header"]');
    const bookingCards = page.locator('tr, [class*="booking"]');
    const emptyMsg = page.locator('text=/no bookings|empty|no data/i');

    const hasTable = (await tableHeaders.count()) > 0;
    const hasCards = (await bookingCards.count()) > 0;
    const hasEmpty = (await emptyMsg.count()) > 0;

    expect(
      hasTable || hasCards || hasEmpty,
      'Expected bookings table, cards, or empty message',
    ).toBeTruthy();
  });

  test('booking detail page loads', async ({ page }) => {
    await page.goto('/admin/bookings', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(5000);

    // Try to click the first booking
    const firstBookingLink = page.locator('a[href*="/admin/bookings/"]').first();

    if ((await firstBookingLink.count()) > 0) {
      await firstBookingLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Should show booking details
      expect(page.url()).toContain('/admin/bookings/');
      await expect(page.locator('body')).toBeVisible();

      // Should not show error
      const error = page.locator('text=/error|not found|something went wrong/i');
      expect(await error.count()).toBe(0);
    }
  });

  test('admin bookings page has no JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(`${err.name}: ${err.message}`));

    await page.goto('/admin/bookings', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    expect(jsErrors, `JS errors: ${jsErrors.join('; ')}`).toHaveLength(0);
  });

  test('admin destinations page loads', async ({ page }) => {
    await page.goto('/admin/destinations', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();

    const error = page.locator('text=/error|failed to load|something went wrong/i');
    expect(await error.count()).toBe(0);
  });

  test('admin hero settings page loads', async ({ page }) => {
    await page.goto('/admin/hero-settings', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();

    const error = page.locator('text=/error|failed to load|something went wrong/i');
    expect(await error.count()).toBe(0);
  });

  test('admin categories page loads', async ({ page }) => {
    await page.goto('/admin/categories', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();

    const error = page.locator('text=/error|failed to load|something went wrong/i');
    expect(await error.count()).toBe(0);
  });

  test('admin reviews page loads', async ({ page }) => {
    await page.goto('/admin/reviews', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();

    const error = page.locator('text=/error|failed to load|something went wrong/i');
    expect(await error.count()).toBe(0);
  });
});
