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

// Surfaces that quote child/infant prices total through guestPricedSubtotal,
// which delegates every whole-unit option to optionSubtotal (proved in
// lib/revenue/__tests__/guestPrices.test.ts) — the unit rule is unchanged.
const GUEST_PRICED_SURFACES = new Set([
  'lib/security/checkoutPricing.ts',
  'app/api/bookings/manual/route.ts',
  'app/api/bookings/manual/[id]/route.ts',
  'lib/utils/generateReceiptPdf.ts',
  'app/[locale]/user/bookings/[id]/page.tsx',
  'app/admin/bookings/[id]/page.tsx',
]);

// Surfaces that total a line through lib/checkout/lineTotals.ts (client) or
// lib/bookings/storedLinePricing.ts (server) — thin wrappers over
// guestPricedSubtotal, so the whole-unit rule is unchanged there too.
const LINE_HELPER_SURFACES: Record<string, { importLine: string; call: RegExp }> = {
  'app/api/checkout/route.ts': { importLine: "from '@/lib/checkout/lineTotals'", call: /lineTotal\((?:cartItem|item)\)/ },
  'app/api/webhooks/stripe/route.ts': { importLine: "from '@/lib/bookings/storedLinePricing'", call: /priceStoredLine\(\{/ },
  'app/[locale]/checkout/CheckoutClientPage.tsx': { importLine: "from '@/lib/checkout/lineTotals'", call: /lineTotal\(item\)/ },
  'components/CartSidebar.tsx': { importLine: "from '@/lib/checkout/lineTotals'", call: /lineTotal\(item\)/ },
};

describe('whole-unit option pricing on every surface', () => {
  it.each(SURFACES)('%s totals through the shared optionSubtotal rule', (rel) => {
    const src = read(rel);
    if (GUEST_PRICED_SURFACES.has(rel)) {
      expect(src).toContain("from '@/lib/revenue/guestPrices'");
      expect(src).toMatch(/guestPricedSubtotal\(/);
      expect(src).not.toMatch(/\boptionSubtotal\(/);
      return;
    }
    if (LINE_HELPER_SURFACES[rel]) {
      expect(src).toContain(LINE_HELPER_SURFACES[rel].importLine);
      expect(src).toMatch(LINE_HELPER_SURFACES[rel].call);
      expect(src).not.toMatch(/\boptionSubtotal\(/);
      return;
    }
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
    // Declared as its own Schema. Inline, a field named `type` makes Mongoose
    // read the surrounding object as a SchemaType declaration: the subdocument
    // collapses and the schema throws "`false` is not a valid type at path
    // `required`" the moment it compiles — invisible to typecheck, lint and
    // every test that mocks the model, and fatal to the production build.
    expect(model).toMatch(/const SelectedBookingOptionSchema = new Schema\(/);
    expect(model).toMatch(/type: \{ type: String \}/);
    expect(model).toMatch(/selectedBookingOption: \{\s*\n\s*type: SelectedBookingOptionSchema,/);
    expect(model).not.toMatch(/selectedBookingOption: \{\s*\n\s*type: \{\s*\n\s*id: String,/);
    expect(read('lib/checkout/prepareStripeCheckout.ts')).toContain('boty: item.selectedBookingOption?.type');
    expect(read('app/api/webhooks/stripe/route.ts')).toContain("type: String(bookingOption?.type || item.boty || 'Per Person')");
    expect(read('app/api/bookings/manual/route.ts')).toContain('type: String(selectedOption.type),');
    expect(read('app/api/bookings/manual/[id]/route.ts')).toContain('type: String(selectedOption.type),');
  });

  it('the webhook recovers a paid line from the immutable quote, with a legacy catalogue fallback', () => {
    const src = read('app/api/webhooks/stripe/route.ts');
    expect(src).toContain('storedOptions.find(');
    expect(src).toMatch(/priceStoredLine\(\{[\s\S]*?option: \(storedOption as UnitCapacityOption & Record<string, unknown>\) \?\? null/);
    expect(src).toContain('const hasPaidSnapshot = item.gp !== undefined;');
    expect(src).toContain('tourSubtotal = recoveryTourSubtotal(paidItem, snapshotOption as UnitCapacityOption | undefined, guestPrices);');
    // `bp` (the server-authoritative adult price captured before payment) is
    // used only to reconstruct that paid snapshot and in mismatch diagnostics.
    const pricingUses = (src.match(/item\.bp/g) || []).length;
    expect(pricingUses).toBe(2);
    expect(src).toMatch(/quotedAtPayment: \{ adult: line\.item\.bp/);
    expect(src).toContain('if (recomputedMinor !== paymentIntent.amount) {');
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

  it('persists and re-renders the server-billed add-on quantity on every after-sale surface', () => {
    const bookingModel = read('lib/models/Booking.ts');
    const webhook = read('app/api/webhooks/stripe/route.ts');
    expect(bookingModel).toMatch(/selectedAddOnDetails:[\s\S]*?quantity: \{ type: Number, min: 1 \}/);
    expect(webhook).toContain('quantity: billedQuantity');
    for (const rel of [
      'app/[locale]/user/bookings/[id]/page.tsx',
      'app/admin/bookings/[id]/page.tsx',
      'lib/utils/generateReceiptPdf.ts',
    ]) {
      const src = read(rel);
      expect(src).toContain("from '@/lib/checkout/addOnPricing'");
      expect(src).toMatch(/storedAddOnUnits\(/);
      expect(src).not.toMatch(/addOnDetail\.perGuest \? totalGuests/);
    }
  });
  it('the running total before a departure is chosen follows the option rule, not per-guest', () => {
    const src = read('components/BookingSidebar.tsx');
    expect(src).toContain('const estimateOption = !slotOption');
    expect(src).toContain('const pricedOption = slotOption ?? estimateOption?.candidate ?? null;');
    expect(src).toContain('optionSubtotal(pricedOption, basePrice, bookingData.adults, bookingData.children, bookingData.infants)');
    // The estimate only offers options the party can actually take.
    expect(src).toMatch(/\.filter\(\(candidate\) => capacityAvailability\(/);
  });
  it.each(SURFACES)('%s passes the infant count so an infant seat counts toward the unit', (rel) => {
    const src = read(rel);
    // Every optionSubtotal call carries a fifth argument (infants) — the
    // authority gate reads it too. A call with only adults + children drifts
    // from the client's "total participants" rule.
    const calls = src.match(/(?:optionSubtotal|guestPricedSubtotal|priceStoredLine|lineTotal)\([^;]*/g) || [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      // lineTotal(item) reads the infant count from the line itself.
      if (/^lineTotal\(item\)/.test(call)) continue;
      expect(call).toMatch(/infant|\bitem\.n\b|\binfants\b|numericInfants/);
    }
  });

});
