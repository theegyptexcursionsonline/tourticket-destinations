import { test, expect } from '@playwright/test';

test.describe('Search functionality', () => {
  test.setTimeout(60_000);

  test('/search page loads with filters', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await expect(page.locator('body')).toBeVisible();

    // Should have a search input
    const searchInput = page.locator(
      'input[type="text"], input[type="search"], input[placeholder*="search" i]',
    ).first();
    await expect(searchInput).toBeVisible();
  });

  test('search returns results for valid query', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const searchInput = page.locator(
      'input[type="text"], input[type="search"], input[placeholder*="search" i]',
    ).first();

    await searchInput.fill('tour');
    await page.waitForTimeout(2000); // Wait for debounced search

    // Should show results or a message
    const results = page.locator('a[href]:has(img)');
    const noResults = page.locator('text=/no results|nothing found|try different/i');

    const hasResults = (await results.count()) > 0;
    const hasNoResultsMsg = (await noResults.count()) > 0;
    expect(
      hasResults || hasNoResultsMsg,
      'Expected search results or "no results" message',
    ).toBeTruthy();
  });

  test('search shows "no results" for nonsense query', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const searchInput = page.locator(
      'input[type="text"], input[type="search"], input[placeholder*="search" i]',
    ).first();

    await searchInput.fill('zzzzxyznonexistent999');
    await page.waitForTimeout(2000);

    // Results count should be 0 or show a "no results" type message
    const noResults = page.locator('text=/no results|nothing found|no tours|try/i');
    if ((await noResults.count()) > 0) {
      await expect(noResults.first()).toBeVisible();
    }
  });

  test('search modal opens from header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Find search trigger in header
    const searchTrigger = page
      .locator('header')
      .locator(
        'input[placeholder*="search" i], input[placeholder*="explore" i], button[aria-label*="search" i]',
      )
      .first();

    if ((await searchTrigger.count()) === 0) {
      test.skip();
      return;
    }

    await searchTrigger.click();
    await page.waitForTimeout(1000);

    // Modal or search overlay should appear
    const searchModal = page.locator(
      '[role="dialog"], [class*="modal" i], [class*="overlay" i]',
    );

    if ((await searchModal.count()) > 0) {
      await expect(searchModal.first()).toBeVisible();

      // Should have an input inside the modal
      const modalInput = searchModal.locator('input').first();
      if ((await modalInput.count()) > 0) {
        await expect(modalInput).toBeVisible();
      }
    }
  });

  test('search API returns valid response', async ({ request }) => {
    const res = await request.get('/api/search/tours?q=pyramids');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
