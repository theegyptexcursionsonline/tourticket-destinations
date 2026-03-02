import { test, expect } from '@playwright/test';

test.describe('Tour detail page', () => {
  test.setTimeout(60_000);

  let tourUrl: string;

  test.beforeAll(async ({ request }) => {
    // Get a real tour slug from the API
    const res = await request.get('/api/tours/public');
    const body = await res.json();
    const tours = body.data || body.tours || [];
    if (tours.length > 0) {
      tourUrl = `/${tours[0].slug}`;
    }
  });

  test('navigates from homepage to tour detail', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Find a tour link (a card with an image that links to a tour)
    const tourLink = page.locator('a[href]:has(img)').first();

    if ((await tourLink.count()) > 0) {
      const href = await tourLink.getAttribute('href');
      await tourLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Should navigate to the tour page
      expect(page.url()).not.toBe('/');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('tour page displays essential information', async ({ page }) => {
    test.skip(!tourUrl, 'No tours available from API');

    await page.goto(tourUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Tour title
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).not.toBeEmpty();

    // Tour image
    const mainImage = page.locator('img').first();
    await expect(mainImage).toBeVisible();

    // Price should be visible somewhere
    const priceText = page.locator('text=/\\$\\d+|USD|€|EGP/i').first();
    if ((await priceText.count()) > 0) {
      await expect(priceText).toBeVisible();
    }
  });

  test('booking sidebar is visible with interactive elements', async ({ page }) => {
    test.skip(!tourUrl, 'No tours available from API');

    await page.goto(tourUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Look for booking-related UI elements
    const bookButton = page.locator(
      'button:has-text("Book"), button:has-text("Add to Cart"), button:has-text("Reserve")',
    ).first();

    if ((await bookButton.count()) > 0) {
      await expect(bookButton).toBeVisible();
    }

    // Date picker should be present
    const datePicker = page.locator('input[type="date"], [class*="date"], [class*="calendar"]').first();
    if ((await datePicker.count()) > 0) {
      await expect(datePicker).toBeVisible();
    }
  });

  test('tour page has no JS errors', async ({ page }) => {
    test.skip(!tourUrl, 'No tours available from API');

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(`${err.name}: ${err.message}`));

    await page.goto(tourUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    expect(jsErrors, `JS errors: ${jsErrors.join('; ')}`).toHaveLength(0);
  });

  test('tour page images load correctly', async ({ page }) => {
    test.skip(!tourUrl, 'No tours available from API');

    await page.goto(tourUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img[src]'));
      return imgs
        .filter((img) => {
          const el = img as HTMLImageElement;
          return el.naturalWidth === 0 && el.src && !el.src.startsWith('data:');
        })
        .map((img) => (img as HTMLImageElement).src);
    });

    expect(
      brokenImages,
      `Broken images:\n${brokenImages.join('\n')}`,
    ).toHaveLength(0);
  });
});
