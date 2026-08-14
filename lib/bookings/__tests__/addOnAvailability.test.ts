import { isAddOnAvailableForOption, normalizedBookingOptionKeys } from '@/lib/bookings/addOnAvailability';

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
});
