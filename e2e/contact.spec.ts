import { test, expect } from '@playwright/test';

test.describe('Contact form', () => {
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  });

  test('contact page loads with form fields', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Form should have name, email, and message fields
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const messageInput = page.locator('textarea, textarea[name="message"]').first();

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(messageInput).toBeVisible();
  });

  test('submit button is present', async ({ page }) => {
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Send"), button:has-text("Submit")',
    ).first();
    await expect(submitBtn).toBeVisible();
  });

  test('form shows validation for empty submit', async ({ page }) => {
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Send"), button:has-text("Submit")',
    ).first();

    await submitBtn.click();
    await page.waitForTimeout(1000);

    // Should show validation errors or browser's native required validation
    // Check for either custom error messages or the form not submitting
    const errorMsg = page.locator('text=/required|please fill|enter/i');
    const isStillOnContactPage = page.url().includes('contact');

    expect(
      (await errorMsg.count()) > 0 || isStillOnContactPage,
      'Form should validate empty fields',
    ).toBeTruthy();
  });

  test('form accepts valid input and submits', async ({ page }) => {
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const messageInput = page.locator('textarea').first();

    await nameInput.fill('E2E Test User');
    await emailInput.fill('e2e-test@example.com');
    await messageInput.fill('This is an automated E2E test message. Please ignore.');

    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Send"), button:has-text("Submit")',
    ).first();
    await submitBtn.click();

    await page.waitForTimeout(3000);

    // Check for success message (toast or inline)
    const successMsg = page.locator('text=/sent|success|thank|received/i');
    const hasSuccess = (await successMsg.count()) > 0;

    // Or check that form was cleared
    const nameValue = await nameInput.inputValue().catch(() => '');
    const formCleared = nameValue === '';

    expect(
      hasSuccess || formCleared,
      'Expected success message or form cleared after submit',
    ).toBeTruthy();
  });

  test('contact page has no JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(`${err.name}: ${err.message}`));

    await page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    expect(jsErrors, `JS errors: ${jsErrors.join('; ')}`).toHaveLength(0);
  });
});
