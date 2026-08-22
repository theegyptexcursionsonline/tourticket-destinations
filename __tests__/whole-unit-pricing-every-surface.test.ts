export {};
// Whole-unit options (Per Group / Per Couple / Per Family) must total the
// same on every surface that prices a booking line — sidebar, cart, checkout
// page, Stripe amount, post-payment booking writer, manual bookings, admin
// create/detail, customer detail, receipt PDF and confirmation email. A
// per-guest copy anywhere reintroduces the $323.18 × 4 overcharge.
const fs = require('fs');
const path = require('path');
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const SURFACES = [
  'lib/security/checkoutPricing.ts',
  'app/api/checkout/route.ts',
  'app/api/webhooks/stripe/route.ts',
  'app/api/bookings/manual/route.ts',
  'app/api/bookings/manual/[id]/route.ts',
  'app/[locale]/checkout/CheckoutClientPage.tsx',
  'app/[locale]/user/bookings/[id]/page.tsx',
  'app/admin/bookings/[id]/page.tsx',
  'app/admin/bookings/create/page.tsx',
  'lib/utils/generateReceiptPdf.ts',
  'components/BookingSidebar.tsx',
  'components/CartSidebar.tsx',
];

describe('whole-unit option pricing on every surface', () => {
  it.each(SURFACES)('%s totals through the shared optionSubtotal rule', (rel) => {
    const src = read(rel);
    expect(src).toContain("from '@/lib/bookings/optionSubtotal'");
    expect(src).toMatch(/optionSubtotal\(/);
  });

  it.each(SURFACES)('%s has no per-guest child-half arithmetic left', (rel) => {
    const src = read(rel);
    // The customer-detail pages keep a per-guest breakdown behind a unitPriced guard.
    const guarded = /const (adultPrice|childPrice) = unitPriced \? [^\n]+\n/g;
    const stripped = src.replace(guarded, '');
    expect(stripped).not.toMatch(/\(basePrice \/ 2\) \* \(/);
    expect(stripped).not.toMatch(/basePrice \* 0\.5/);
  });

  it('persists the option type on the booking so detail pages can apply the rule', () => {
    const model = read('lib/models/Booking.ts');
    expect(model).toMatch(/selectedBookingOption\?: \{[\s\S]*?type\?: string;/);
    expect(model).toMatch(/selectedBookingOption: \{\s*type: \{[\s\S]*?type: String,/);
    expect(read('lib/checkout/prepareStripeCheckout.ts')).toContain('boty: item.selectedBookingOption?.type');
    expect(read('app/api/webhooks/stripe/route.ts')).toContain("type: String(storedOption?.type || item.boty || '')");
    expect(read('app/api/bookings/manual/route.ts')).toContain('type: String(selectedOption.type),');
    expect(read('app/api/bookings/manual/[id]/route.ts')).toContain('type: String(selectedOption.type),');
  });

  it('the webhook reads the option type from the stored tour, never trusting the summary alone', () => {
    const src = read('app/api/webhooks/stripe/route.ts');
    expect(src).toContain('storedOptions.find(');
    expect(src).toMatch(/optionSubtotal\(\s*\(storedOption as UnitCapacityOption \| undefined\) \?\? null/);
  });

  it('confirmation email describes a whole-unit line as units, not adults × price', () => {
    const src = read('app/api/checkout/route.ts');
    expect(src).toContain('const mainIsUnitPriced = Boolean(mainOption && isUnitPricedType(mainOption.type));');
    expect(src).toContain('!mainIsUnitPriced && childCount > 0');
  });
});
