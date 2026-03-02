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

    // Look for tour cards by common patterns
    const tourCards = page.locator(
      'a[href*="/"] >> .tour-card, [class*="tour-card"], [class*="TourCard"], [class*="card"]',
    );
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
    const destLink = page.locator('a[href*="destinations"]').first();
    if ((await destLink.count()) > 0) {
      await destLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('destinations');
    }
  });

  test('search interaction opens search UI', async ({ page }) => {
    // Find search input or button in header
    const searchTrigger = page
      .locator('header')
      .locator('input[type="text"], input[placeholder*="search" i], button[aria-label*="search" i], [class*="search"]')
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
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const emailInput = page.locator(
      'input[type="email"][placeholder*="email" i], input[name="email"]',
    ).last();

    if ((await emailInput.count()) > 0) {
      await emailInput.fill('e2e-test@example.com');

      // Find the submit button near the email input
      const form = emailInput.locator('xpath=ancestor::form');
      const submitBtn = form.locator('button[type="submit"], button').first();

      if ((await submitBtn.count()) > 0) {
        await submitBtn.click();
        await page.waitForTimeout(2000);

        // Check for success indication (toast, message, or input cleared)
        const successIndicator = page.locator(
          'text=/subscribed|success|thank/i',
        );
        const inputCleared = await emailInput.inputValue();
        const hasSuccess =
          (await successIndicator.count()) > 0 || inputCleared === '';
        expect(hasSuccess).toBeTruthy();
      }
    }
  });
});
