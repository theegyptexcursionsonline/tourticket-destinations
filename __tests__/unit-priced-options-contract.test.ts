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

describe('both pricing surfaces use the shared unit rule', () => {
  it('the booking sidebar stops multiplying a unit price per participant', () => {
    const sidebar = read('components/BookingSidebar.tsx');
    expect(sidebar).toContain("from '@/lib/bookings/unitPricing'");
    expect(sidebar).toContain('isUnitPricedType(option.type)');
    expect(sidebar).toContain('units * basePrice');
    // the old unconditional per-guest maths must no longer stand alone
    expect(sidebar).not.toMatch(/const subtotal = \(adults \* basePrice\)/);
  });

  it('the authoritative server total applies the same rule from the STORED option', () => {
    const checkout = read('app/api/checkout/route.ts');
    expect(checkout).toContain("from '@/lib/bookings/unitPricing'");
    expect(checkout).toContain('isUnitPricedType(storedOption.type');
    expect(checkout).toContain('units * basePrice');
    // the option type is read from the tour, never from the submitted cart
    expect(checkout).toContain('storedOptions');
    expect(checkout).not.toMatch(/isUnitPricedType\(cartItem/);
  });
});
