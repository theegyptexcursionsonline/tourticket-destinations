import { type Page, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || '';

export function hasAdminCredentials(): boolean {
  return !!(ADMIN_EMAIL && ADMIN_PASSWORD);
}

export async function adminLogin(page: Page): Promise<void> {
  if (!hasAdminCredentials()) {
    throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD env vars required');
  }

  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded');

  // Fill login form
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard or admin page
  await page.waitForURL(/\/admin(?!.*login)/, { timeout: 15_000 });
  await expect(page.locator('body')).toBeVisible();
}
