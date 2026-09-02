import {
  addOnQuantityLimit,
  clampAddOnQuantity,
  clampSelectedAddOnQuantities,
  perPersonAddOnLimit,
} from '@/lib/bookings/bookingSelection';

/**
 * Client sheet (EEO 24 Aug / MT 31 Aug): a per-person add-on is chosen by
 * the guest, one unit at a time, up to the number of paying participants —
 * never auto-multiplied by the party size.
 */
describe('per-person add-on quantity bounds', () => {
  it('limits per-person add-ons to one per paying participant (infants excluded)', () => {
    expect(perPersonAddOnLimit(2, 1)).toBe(3);
    expect(perPersonAddOnLimit(4, 0)).toBe(4);
  });

  it('allows no per-person units without a paying participant', () => {
    expect(perPersonAddOnLimit(0, 0)).toBe(0);
    expect(perPersonAddOnLimit(Number.NaN, -3)).toBe(0);
    expect(clampAddOnQuantity(1, 0)).toBe(0);
  });

  it('clamps the requested quantity into [1, limit]', () => {
    expect(clampAddOnQuantity(2, 4)).toBe(2);
    expect(clampAddOnQuantity(9, 4)).toBe(4);
    expect(clampAddOnQuantity(0, 4)).toBe(1);
    expect(clampAddOnQuantity(Number.NaN, 4)).toBe(1);
    expect(clampAddOnQuantity(2.9, 4)).toBe(2);
  });

  it('enforces authored maxima for both pricing methods', () => {
    expect(addOnQuantityLimit({ perGuest: false }, 3, 0)).toBe(1);
    expect(addOnQuantityLimit({ perGuest: false, maxQuantity: 4 }, 3, 0)).toBe(4);
    expect(addOnQuantityLimit({ perGuest: true, maxQuantity: 2 }, 3, 1)).toBe(2);
    expect(clampSelectedAddOnQuantities(
      { transfer: 9, meal: 9 },
      [
        { id: 'transfer', perGuest: false, maxQuantity: 3 },
        { id: 'meal', perGuest: true },
      ],
      2,
      1,
    )).toEqual({ transfer: 3, meal: 3 });
  });
});
