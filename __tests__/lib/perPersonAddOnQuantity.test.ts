import { clampAddOnQuantity, perPersonAddOnLimit } from '@/lib/bookings/bookingSelection';

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

  it('never drops below one unit even with a malformed party', () => {
    expect(perPersonAddOnLimit(0, 0)).toBe(1);
    expect(perPersonAddOnLimit(Number.NaN, -3)).toBe(1);
  });

  it('clamps the requested quantity into [1, limit]', () => {
    expect(clampAddOnQuantity(2, 4)).toBe(2);
    expect(clampAddOnQuantity(9, 4)).toBe(4);
    expect(clampAddOnQuantity(0, 4)).toBe(1);
    expect(clampAddOnQuantity(Number.NaN, 4)).toBe(1);
    expect(clampAddOnQuantity(2.9, 4)).toBe(2);
  });
});
