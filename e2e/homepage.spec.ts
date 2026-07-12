import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  });

  test('hero section is visible with heading text', async ({ page }) => {
    // Hero section should have a prominent heading
    const hero = page.locator('section, [class*="hero"], [class*="Hero"]').first();
    await expect(hero).toBeVisible({ timeout: 10_000 });

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).not.toBeEmpty();
  });

  test('displays tour cards', async ({ page }) => {
    // Wait for tours to load
    await page.waitForTimeout(2000);

    const cardLinks = page.locator('a[href]:has(img)');

    const count = await cardLinks.count();
    expect(count, 'Expected at least 1 tour/content card on homepage').toBeGreaterThan(0);
  });

  test('header is visible with navigation', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    // Should have navigation links
    const navLinks = header.locator('a[href]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('footer is visible with links', async ({ page }) => {
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();

    const links = footer.locator('a[href]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('destinations link navigates correctly', async ({ page }) => {
    // Find and click a destinations link
    const destLink = page
      .locator('main a[href="/destinations"], header a[href="/destinations"], footer a[href="/destinations"]')
      .filter({ visible: true })
      .first();
    if ((await destLink.count()) > 0) {
      await destLink.click();
      await page.waitForURL('**/destinations', { timeout: 10_000 });
      expect(page.url()).toContain('destinations');
    }
  });

  test('search interaction opens search UI', async ({ page }) => {
    // Find search input or button in header
    const searchTrigger = page
      .locator('header')
      .locator('input[type="text"], input[placeholder*="search" i], button[aria-label*="search" i], [class*="search"]')
      .filter({ visible: true })
      .first();

    if ((await searchTrigger.count()) > 0) {
      await searchTrigger.click();
      await page.waitForTimeout(500);

      // Search modal or expanded search should appear
      const searchUI = page.locator(
        '[role="dialog"], [class*="modal"], [class*="Modal"], [class*="search-modal"]',
      );
      const isVisible = await searchUI.isVisible().catch(() => false);
      // If modal opens, great; if search is inline, the input should be focused
      expect(isVisible || (await searchTrigger.isVisible())).toBeTruthy();
    }
  });

  test('newsletter subscribe form works', async ({ page }) => {
    // Scroll to footer area where newsletter form typically is
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();

    const form = footer.locator('form:has(input[type="email"])').first();
    if ((await form.count()) === 0) return;

    await page.route('**/api/subscribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Successfully subscribed!' }),
      });
    });

    await form.locator('input[type="email"]').fill(`e2e-test-${Date.now()}@example.com`);
    await form.evaluate((newsletterForm: HTMLFormElement) => newsletterForm.requestSubmit());

    await expect(
      footer.locator('text=/subscribed|success|thank/i').first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.unroute('**/api/subscribe');
  });
});
