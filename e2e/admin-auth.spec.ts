import { test, expect } from '@playwright/test';
import { adminLogin, hasAdminCredentials } from './helpers/admin-auth';

test.describe('Admin authentication', () => {
  test.setTimeout(30_000);

  test('admin page shows login form', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('login form shows error for empty submit', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // Should remain on login page (HTML5 validation or custom error)
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
  });

  test('login form shows error for invalid credentials', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    await page.locator('#email').fill('invalid@test.com');
    await page.locator('#password').fill('wrongpassword123');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    // Should show error message
    const error = page.locator('text=/invalid|incorrect|failed|error/i');
    const isStillOnLogin = await page.locator('#email').isVisible();

    expect(
      (await error.count()) > 0 || isStillOnLogin,
      'Should show error or remain on login page',
    ).toBeTruthy();
  });

  test('valid login redirects to dashboard', async ({ page }) => {
    test.skip(!hasAdminCredentials(), 'TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set');

    await adminLogin(page);

    // Should be on an admin page (not login)
    await expect(page.locator('#email')).not.toBeVisible({ timeout: 5000 });

    // Dashboard content should be visible
    const dashboardContent = page.locator('text=/dashboard|bookings|tours|welcome/i').first();
    await expect(dashboardContent).toBeVisible({ timeout: 10_000 });
  });

  test('admin dashboard loads with data', async ({ page }) => {
    test.skip(!hasAdminCredentials(), 'Admin credentials not set');

    await adminLogin(page);

    // Dashboard should show stats or data
    await page.waitForTimeout(3000);
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Page should not show error state
    const errorState = page.locator('text=/error loading|something went wrong|500/i');
    expect(await errorState.count()).toBe(0);
  });

  test('admin page has no JS errors on load', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(`${err.name}: ${err.message}`));

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    expect(jsErrors, `JS errors: ${jsErrors.join('; ')}`).toHaveLength(0);
  });
});
