export {};

// The repo's RN-free tsconfig has no Node types; match the sibling idiom.
declare const __dirname: string;
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

import {
  effectiveUnitSize,
  isUnitPricedType,
  unitCount,
} from '../lib/bookings/unitPricing';

/**
 * Client report on the EEO sheet (2026-08-20): a Per Group option priced at
 * $323.18 was charged $1,131.13 for 3.5 participants — the whole-unit price
 * was multiplied by the head count. This network offers the same Per Group /
 * Per Couple / Per Family types from its tour editor, so it had the same
 * defect on both the sidebar total and the authoritative server total.
 */
describe('whole-unit option pricing', () => {
  it('charges a legacy Per Group option once for the whole booking', () => {
    const option = { type: 'Per Group' };
    expect(isUnitPricedType(option.type)).toBe(true);
    expect(unitCount(4, effectiveUnitSize(option))).toBe(1);
    // the reported overcharge: 3 participants must not pay 3 group prices
    expect(unitCount(3, effectiveUnitSize(option)) * 323.18).toBeCloseTo(323.18, 2);
  });

  it('steps a couple option up in whole couples', () => {
    const option = { type: 'Per Couple' };
    expect(effectiveUnitSize(option)).toBe(2);
    expect(unitCount(1, 2)).toBe(1);
    expect(unitCount(2, 2)).toBe(1);
    expect(unitCount(3, 2)).toBe(2);
    expect(unitCount(4, 2)).toBe(2);
  });

  it('treats Per Person as per-guest, not as a unit', () => {
    expect(isUnitPricedType('Per Person')).toBe(false);
    expect(effectiveUnitSize({ type: 'Per Person' })).toBeNull();
  });

  it('reads a family option as four participants per unit', () => {
    expect(effectiveUnitSize({ type: 'Per Family' })).toBe(4);
    expect(unitCount(5, 4)).toBe(2);
  });
});

describe('every pricing surface bills by the one shared subtotal rule', () => {
  it.each([
    // The Stripe amount and the recorded booking quote child/infant prices
    // per departure through guestPricedSubtotal, which hands every whole-unit
    // option to optionSubtotal (proved in lib/revenue/__tests__/guestPrices.test.ts).
    ['the Stripe amount', 'lib/security/checkoutPricing.ts', 'guestPricedSubtotal(selectedOption ?? null, guestPrices, adults, children, infants)', "from '@/lib/revenue/guestPrices'"],
    // The booking writer consumes the already server-validated cart and uses
    // lineTotal, whose implementation delegates to guestPricedSubtotal.
    ['the recorded booking', 'app/api/checkout/route.ts', 'lineTotal(item)', "from '@/lib/checkout/lineTotals'"],
    // The cart totals through lib/checkout/lineTotals.ts, a thin wrapper over guestPricedSubtotal.
    ['the cart', 'components/CartSidebar.tsx', 'lineTotal(item)', "from '@/lib/checkout/lineTotals'"],
    ['the booking sidebar', 'components/BookingSidebar.tsx', 'optionSubtotal(option, basePrice, adults, children, infants)', "from '@/lib/bookings/optionSubtotal'"],
  ])('%s uses optionSubtotal', (_surface, file, call, importLine) => {
    const source = read(file);
    expect(source).toContain(importLine);
    expect(source).toContain(call);
    // no surface keeps its own per-guest arithmetic alongside the rule
    expect(source).not.toMatch(/basePrice \* adults \+ \(basePrice \/ 2\)/);
    expect(source).not.toMatch(/const adultPrice = basePrice \* \(/);
  });

  it('the server surfaces read the option type from the stored tour, never the cart', () => {
    const checkout = read('app/api/checkout/route.ts');
    expect(checkout).toContain('validatedCheckout = await calculateCheckoutPricing(cart, tenantId, appliedDiscountCode)');
    expect(checkout).toContain('validatedCheckout = await recoverSettledCheckout(');
    expect(checkout).toContain('cart = validatedCheckout.cart');
    expect(checkout).not.toMatch(/optionSubtotal\(cartItem\.selectedBookingOption/);
    const stripe = read('lib/security/checkoutPricing.ts');
    expect(stripe).toContain('const options = Array.isArray(tour.bookingOptions) ? tour.bookingOptions : []');
    expect(stripe).toContain('selectedOption = selectedOptionIndex >= 0 ? options[selectedOptionIndex] : undefined');
  });
});

describe('the option type reaches every surface that totals a line', () => {
  it('the sidebar writes the pricing type into the cart line', () => {
    const sidebar = read('components/BookingSidebar.tsx');
    expect(sidebar).toMatch(/selectedBookingOptionDetails = selectedOption \? \{[\s\S]{0,300}type: selectedOption\.type/);
  });

  it('the validated cart carries the STORED type, so emails and the booking record total correctly', () => {
    const stripe = read('lib/security/checkoutPricing.ts');
    expect(stripe).toMatch(/type: selectedOption\.type,[\s\S]{0,80}price: basePrice/);
  });

  it('no copy of the per-guest arithmetic survives in the checkout route', () => {
    const checkout = read('app/api/checkout/route.ts');
    expect(checkout).not.toMatch(/const adultPrice = basePrice \* \(/);
    expect((checkout.match(/lineTotal\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(checkout).not.toMatch(/\boptionSubtotal\(/);
  });
});
