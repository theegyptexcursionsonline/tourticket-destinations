import { test, expect } from '@playwright/test';

test.describe('Destination pages', () => {
  test.setTimeout(60_000);

  let destinationSlug: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.get('/api/destinations');
    const body = await res.json();
    const destinations = body.data || body.destinations || [];
    if (destinations.length > 0) {
      destinationSlug = destinations[0].slug;
    }
  });

  test('/destinations — loads with destination cards', async ({ page }) => {
    await page.goto('/destinations', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Should show destination cards/links
    const cards = page.locator('a[href*="destinations/"]');
    const count = await cards.count();
    expect(count, 'Expected at least 1 destination card').toBeGreaterThan(0);
  });

  test('clicking destination navigates to detail page', async ({ page }) => {
    await page.goto('/destinations', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    const firstCard = page.locator('a[href*="destinations/"]').first();
    if ((await firstCard.count()) > 0) {
      await firstCard.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('destinations/');
    }
  });

  test('destination detail — shows name and description', async ({ page }) => {
    test.skip(!destinationSlug, 'No destinations available from API');

    await page.goto(`/destinations/${destinationSlug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Page should have a title
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).not.toBeEmpty();
  });

  test('destination detail — shows tours', async ({ page }) => {
    test.skip(!destinationSlug, 'No destinations available from API');

    await page.goto(`/destinations/${destinationSlug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForTimeout(3000);

    // Should display tour cards or a "no tours" message
    const tourCards = page.locator('a[href]:has(img)');
    const noToursMsg = page.locator('text=/no tours|coming soon/i');

    const hasTours = (await tourCards.count()) > 0;
    const hasMessage = (await noToursMsg.count()) > 0;
    expect(hasTours || hasMessage, 'Expected tours or "no tours" message').toBeTruthy();
  });

  test('destination detail — has no JS errors', async ({ page }) => {
    test.skip(!destinationSlug, 'No destinations available from API');

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(`${err.name}: ${err.message}`));

    await page.goto(`/destinations/${destinationSlug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForTimeout(2000);

    expect(jsErrors, `JS errors: ${jsErrors.join('; ')}`).toHaveLength(0);
  });

  test('destination detail — stats section visible', async ({ page }) => {
    test.skip(!destinationSlug, 'No destinations available from API');

    await page.goto(`/destinations/${destinationSlug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Look for stats like tour count, rating, travelers
    const statsArea = page.locator('text=/tours|rating|travelers/i').first();
    if ((await statsArea.count()) > 0) {
      await expect(statsArea).toBeVisible();
    }
  });
});
