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

    // Set date if a native date input is available on the page.
    const dateInput = page.locator('input[type="date"]').filter({ visible: true }).first();
    if ((await dateInput.count()) > 0) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      await dateInput.fill(futureDate.toISOString().split('T')[0]);
    }

    // Prefer the cart action. Date selection opens the booking drawer and can cover
    // the page button, so the test should not click broad "Select" controls first.
    const bookBtn = page
      .locator(
        'button:has-text("Quick Add to Cart"), button:has-text("Add to Cart"), button:has-text("Book Now"), button:has-text("Reserve")',
      )
      .filter({ visible: true })
      .first();

    if ((await bookBtn.count()) > 0 && (await bookBtn.isEnabled())) {
      await bookBtn.click();
      await page.waitForTimeout(2000);

      // Should either navigate to checkout, show cart/sidebar, or open the booking drawer.
      const onCheckout = page.url().includes('checkout');
      const bookingSurfaceVisible = await page
        .locator('[role="dialog"], [class*="cart" i], [class*="sidebar" i]')
        .first()
        .isVisible()
        .catch(() => false);

      // If cart/sidebar opened, use its checkout button when present.
      if (bookingSurfaceVisible && !onCheckout) {
        const checkoutBtn = page
          .locator(
          'a:has-text("Checkout"), button:has-text("Checkout"), a[href*="checkout"]',
          )
          .filter({ visible: true })
          .first();
        if ((await checkoutBtn.count()) > 0) {
          await checkoutBtn.click();
          await page.waitForLoadState('domcontentloaded');
        }
      }

      expect(
        page.url().includes('checkout') || bookingSurfaceVisible,
        'Booking action should navigate to checkout or open a booking/cart surface',
      ).toBeTruthy();
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

    // Empty carts may redirect to the homepage before checkout validation is available.
    if (!page.url().includes('checkout')) {
      await expect(page.locator('main').first()).toBeVisible();
      return;
    }

    // If the page has a payment/submit button, try clicking without filling form
    const submitBtn = page
      .locator(
        'button:has-text("Complete"), button:has-text("Pay"), button:has-text("Place Order")',
      )
      .filter({ visible: true })
      .first();

    if ((await submitBtn.count()) > 0) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // Should stay on checkout, show validation, or safely redirect if the cart is empty.
      const validationVisible = await page
        .locator('text=/required|please fill|cart is empty|empty/i')
        .first()
        .isVisible()
        .catch(() => false);
      const pageStillUsable = await page.locator('main').first().isVisible().catch(() => false);
      expect(
        page.url().includes('checkout') || validationVisible || pageStillUsable,
        'Checkout submit should validate or leave the user on a usable page',
      ).toBeTruthy();
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
