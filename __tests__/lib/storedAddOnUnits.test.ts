import { storedAddOnUnits } from '@/lib/checkout/addOnPricing';

describe('storedAddOnUnits', () => {
  it('renders the recorded per-person units on a new booking', () => {
    expect(storedAddOnUnits({ perGuest: true, quantity: 2 }, 2, 4, 0)).toBe(2);
  });

  it('caps a recorded quantity at one per paying participant', () => {
    expect(storedAddOnUnits({ perGuest: true, quantity: 9 }, 9, 2, 1)).toBe(3);
  });

  it('preserves the paying-party interpretation for a legacy line', () => {
    expect(storedAddOnUnits({ perGuest: true }, 1, 3, 1)).toBe(4);
    expect(storedAddOnUnits({ perGuest: true, quantity: undefined }, 1, 2, 0)).toBe(2);
  });

  it('uses the stored quantity for per-unit add-ons', () => {
    expect(storedAddOnUnits({ perGuest: false }, 2, 4, 0)).toBe(2);
    expect(storedAddOnUnits({ perGuest: false, quantity: 7 }, 2, 4, 0)).toBe(2);
  });

  it('treats malformed quantities as zero units', () => {
    expect(storedAddOnUnits({ perGuest: false }, 'x', 4, 0)).toBe(0);
  });
});
