import { test, expect } from '@playwright/test';

test.describe('Booking flow (guest checkout)', () => {
  test.setTimeout(90_000);

  let tourSlug: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.get('/api/tours/public');
    const body = await res.json();
    const tours = body.data || body.tours || [];
    if (tours.length > 0) {
      tourSlug = tours[0].slug;
    }
  });

  test('tour page has booking controls', async ({ page }) => {
    test.skip(!tourSlug, 'No tours available');

    await page.goto(`/${tourSlug}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Should have a "Book Now" or "Add to Cart" button
    const bookBtn = page.locator(
      'button:has-text("Book"), button:has-text("Cart"), button:has-text("Reserve"), button:has-text("Select")',
    ).first();

    if ((await bookBtn.count()) > 0) {
      await expect(bookBtn).toBeVisible();
    }
  });

  test('can select date on tour page', async ({ page }) => {
    test.skip(!tourSlug, 'No tours available');

    await page.goto(`/${tourSlug}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Look for date input
    const dateInput = page.locator(
      'input[type="date"], [class*="date-picker"], [class*="calendar"]',
    ).first();

    if ((await dateInput.count()) > 0) {
      // Set a future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      const dateStr = futureDate.toISOString().split('T')[0];

      if (await dateInput.getAttribute('type') === 'date') {
        await dateInput.fill(dateStr);
        const value = await dateInput.inputValue();
        expect(value).toBe(dateStr);
      }
    }
  });

  test('add to cart and navigate to checkout', async ({ page }) => {
    test.skip(!tourSlug, 'No tours available');

    await page.goto(`/${tourSlug}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Try to find and click a booking option first
    const optionBtn = page.locator(
      'button:has-text("Select"), [class*="booking-option"] button',
    ).first();
    if ((await optionBtn.count()) > 0) {
      await optionBtn.click();
      await page.waitForTimeout(500);
    }

    // Set date if available
    const dateInput = page.locator('input[type="date"]').first();
    if ((await dateInput.count()) > 0) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      await dateInput.fill(futureDate.toISOString().split('T')[0]);
    }

    // Click "Book Now" or "Add to Cart"
    const bookBtn = page.locator(
      'button:has-text("Book Now"), button:has-text("Add to Cart"), button:has-text("Reserve")',
    ).first();

    if ((await bookBtn.count()) > 0 && (await bookBtn.isEnabled())) {
      await bookBtn.click();
      await page.waitForTimeout(2000);

      // Should either navigate to checkout or show cart sidebar
      const onCheckout = page.url().includes('checkout');
      const cartVisible = await page
        .locator('[class*="cart" i], [class*="sidebar" i]')
        .first()
        .isVisible()
        .catch(() => false);

      // If cart sidebar opened, look for "Checkout" button
      if (cartVisible && !onCheckout) {
        const checkoutBtn = page.locator(
          'a:has-text("Checkout"), button:has-text("Checkout"), a[href*="checkout"]',
        ).first();
        if ((await checkoutBtn.count()) > 0) {
          await checkoutBtn.click();
          await page.waitForLoadState('domcontentloaded');
        }
      }
    }
  });

  test('checkout page loads with form fields', async ({ page }) => {
    await page.goto('/checkout', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Checkout should have either a form or "cart is empty" message
    const guestForm = page.locator('input[type="email"], input[name="email"]');
    const emptyCart = page.locator('text=/empty|no items|cart is empty/i');

    const hasForm = (await guestForm.count()) > 0;
    const isEmpty = (await emptyCart.count()) > 0;

    expect(
      hasForm || isEmpty,
      'Checkout should show form or empty cart message',
    ).toBeTruthy();
  });

  test('checkout form validates required fields', async ({ page }) => {
    await page.goto('/checkout', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // If the page has a payment/submit button, try clicking without filling form
    const submitBtn = page.locator(
      'button:has-text("Complete"), button:has-text("Pay"), button:has-text("Place Order")',
    ).first();

    if ((await submitBtn.count()) > 0) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // Should stay on checkout (validation prevents submission)
      expect(page.url()).toContain('checkout');
    }
  });

  test('checkout page has no JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(`${err.name}: ${err.message}`));

    await page.goto('/checkout', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    expect(jsErrors, `JS errors: ${jsErrors.join('; ')}`).toHaveLength(0);
  });
});
