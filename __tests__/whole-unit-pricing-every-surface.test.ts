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

  it('the option card labels a whole-unit rate by its unit, never "per person"', () => {
    const src = read('components/BookingSidebar.tsx');
    expect(src).toContain('unitNounKey');
    expect(src).toContain('${units} ${t(unitNounKey(option.type, units))} × ${formatPrice(basePrice)}');
    // The per-person wording survives only as the non-unit branch.
    expect(src).not.toMatch(/<span className="text-gray-600 text-xs">\{t\('price\.perPerson'\)\}: /);
  });

  it('the capacity banner and unit nouns are translated, not hardcoded English', () => {
    const src = read('components/BookingSidebar.tsx');
    expect(src).toContain("'booking.capacityBelowMinimum'");
    expect(src).toContain("'booking.capacityAboveMaximum'");
    expect(src).not.toMatch(/`Needs at least \$\{/);
    expect(src).not.toMatch(/`Takes up to \$\{/);
    for (const locale of ['en', 'de', 'fr', 'es', 'ru', 'ar']) {
      const messages = JSON.parse(read(`messages/${locale}.json`));
      expect(messages.booking.capacityBelowMinimum).toEqual(expect.stringContaining('{limit}'));
      expect(messages.booking.capacityAboveMaximum).toEqual(expect.stringContaining('{participants}'));
      for (const key of ['unitCouple', 'unitCouples', 'unitFamily', 'unitFamilies', 'unitGroup', 'unitGroups', 'unitDefault', 'unitDefaults']) {
        expect(typeof messages.price[key]).toBe('string');
        expect(messages.price[key].length).toBeGreaterThan(0);
      }
    }
  });

  it('confirmation email describes a whole-unit line as units, not adults × price', () => {
    const src = read('app/api/checkout/route.ts');
    expect(src).toContain('const mainIsUnitPriced = Boolean(mainOption && isUnitPricedType(mainOption.type));');
    expect(src).toContain('!mainIsUnitPriced && childCount > 0');
  });
  it('the running total before a departure is chosen follows the option rule, not per-guest', () => {
    const src = read('components/BookingSidebar.tsx');
    expect(src).toContain('const estimateOption = !slotOption');
    expect(src).toContain('const pricedOption = slotOption ?? estimateOption?.candidate ?? null;');
    expect(src).toContain('optionSubtotal(pricedOption, basePrice, bookingData.adults, bookingData.children)');
    // The estimate only offers options the party can actually take.
    expect(src).toMatch(/\.filter\(\(candidate\) => capacityAvailability\(/);
  });
});
