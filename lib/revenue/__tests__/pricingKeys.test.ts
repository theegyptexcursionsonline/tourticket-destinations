import { ensureBookingOptionPricingKeys } from '@/lib/revenue/pricingKeys';

describe('immutable pricing keys', () => {
  it('preserves keys when options are reordered', () => {
    const assigned = ensureBookingOptionPricingKeys('tour-1', [
      { id: 'adult-package', type: 'group', label: 'Standard' },
      { id: 'private-package', type: 'private', label: 'Private' },
    ])!;
    const reordered = ensureBookingOptionPricingKeys('tour-1', [assigned[1], assigned[0]])!;
    expect(reordered.map((option) => option.pricingKey)).toEqual([assigned[1].pricingKey, assigned[0].pricingKey]);
  });

  it('uses a stable source id instead of array position', () => {
    const first = ensureBookingOptionPricingKeys('tour-1', [{ id: 'source-option', type: 'group', label: 'Standard' }])![0];
    const second = ensureBookingOptionPricingKeys('tour-1', [{ id: 'source-option', type: 'group', label: 'Renamed' }])![0];
    expect(first.pricingKey?.split('-').at(-1)).toBe(second.pricingKey?.split('-').at(-1));
  });
});
