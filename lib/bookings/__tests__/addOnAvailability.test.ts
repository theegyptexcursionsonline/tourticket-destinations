import { groupAvailableAddOns, isAddOnAvailableForOption, normalizedBookingOptionKeys } from '@/lib/bookings/addOnAvailability';

describe('add-on booking-option assignments', () => {
  it('keeps legacy and explicitly universal add-ons available', () => {
    expect(isAddOnAvailableForOption({}, 'option-a')).toBe(true);
    expect(isAddOnAvailableForOption({ bookingOptionKeys: [] }, 'option-a')).toBe(true);
  });

  it('only exposes assigned add-ons to the matching option id', () => {
    const addOn = { bookingOptionKeys: [' option-a ', 'option-a', 'option-b'] };
    expect(normalizedBookingOptionKeys(addOn)).toEqual(['option-a', 'option-b']);
    expect(isAddOnAvailableForOption(addOn, 'option-a')).toBe(true);
    expect(isAddOnAvailableForOption(addOn, 'option-c')).toBe(false);
    expect(isAddOnAvailableForOption(addOn, null)).toBe(false);
  });

  it('preserves authored group order and optional titles for checkout rendering', () => {
    const groups = groupAvailableAddOns([
      { _id: 'meal', groupKey: 'food', groupTitle: 'Food & Drink' },
      { _id: 'photo', groupKey: 'media', groupTitle: '' },
      { _id: 'dessert', groupKey: 'food', groupTitle: 'Food & Drink' },
    ]);

    expect(groups).toEqual([
      { key: 'food', title: 'Food & Drink', addOns: [expect.objectContaining({ _id: 'meal' }), expect.objectContaining({ _id: 'dessert' })] },
      { key: 'media', title: '', addOns: [expect.objectContaining({ _id: 'photo' })] },
    ]);
  });

  it('collects add-ons saved before grouping existed under one ungrouped group', () => {
    const groups = groupAvailableAddOns([
      { _id: 'legacy-a' },
      { _id: 'legacy-b', groupKey: '   ' },
      { _id: 'new', groupKey: 'extras', groupTitle: 'Extras' },
    ]);

    expect(groups.map((group) => group.key)).toEqual(['ungrouped', 'extras']);
    expect(groups[0].addOns).toHaveLength(2);
    expect(groups[0].title).toBe('');
  });
});
