import { bookableTripPrice, compareFromPrice, lowestOptionPrice, tourFromPrice } from '@/lib/pricing/displayPrice';

describe('tourFromPrice', () => {
  it('advertises the cheapest effective option, with the discount only where opted in', () => {
    const result = tourFromPrice({
      discountPercent: 20,
      bookingOptions: [
        { price: 150, applyTourDiscount: true },   // 120 effective
        { price: 130, applyTourDiscount: false },  // 130 stays
      ],
    });
    expect(result).toEqual({ price: 120, originalPrice: 150, discountApplied: true });
  });

  it('shows no reduction when no option opted in', () => {
    const result = tourFromPrice({
      discountPercent: 20,
      bookingOptions: [{ price: 90, applyTourDiscount: false }],
    });
    expect(result).toEqual({ price: 90, originalPrice: 90, discountApplied: false });
  });

  it('advertises the cheapest chargeable slot instead of an option base price', () => {
    const result = tourFromPrice({
      discountPercent: 20,
      bookingOptions: [
        {
          price: 150,
          applyTourDiscount: true,
          timeSlots: [{ price: 50 }, { price: 200 }],
        },
      ],
    });

    expect(result).toEqual({ price: 40, originalPrice: 50, discountApplied: true });
  });

  it('uses the option base when a configured slot inherits its price', () => {
    expect(tourFromPrice({
      bookingOptions: [{ price: 90, timeSlots: [{ price: null }] }],
    })).toEqual({ price: 90, originalPrice: 90, discountApplied: false });
  });

  it('falls back to the tour price when the payload ships no options', () => {
    expect(tourFromPrice({ discountPrice: 55, originalPrice: 70 })).toEqual({
      price: 55,
      originalPrice: 70,
      discountApplied: true,
    });
    expect(tourFromPrice({ price: 40 })).toEqual({ price: 40, originalPrice: 40, discountApplied: false });
  });

  it('never advertises a strikethrough equal to the price', () => {
    expect(tourFromPrice({ discountPrice: 380, originalPrice: 380 })?.discountApplied).toBe(false);
  });
});

// #2727: a new option starts with a 0 base; staff price some only per start
// time and leave some unpriced. 0 is "not priced yet", never a price to show.
describe('unpriced options never advertise $0.00', () => {
  it('prices a 0-base option by its priced start times, skipping a 0 start time', () => {
    const tour = {
      discountPrice: 0,
      bookingOptions: [{ price: 0, timeSlots: [{ price: 0 }, { price: 116 }, { price: 90 }] }],
    };
    expect(lowestOptionPrice(tour)).toEqual({ price: 90, originalPrice: 90, discountApplied: false });
    expect(tourFromPrice(tour)).toEqual({ price: 90, originalPrice: 90, discountApplied: false });
    expect(bookableTripPrice(tour)).toEqual({ price: 90, originalPrice: 90, discountApplied: false });
  });

  it('a 0-base option with no start-time price is skipped beside a priced option', () => {
    const tour = {
      discountPrice: 60,
      bookingOptions: [{ price: 60 }, { price: 0 }, { price: 0, timeSlots: [{ price: null }] }],
    };
    expect(tourFromPrice(tour)?.price).toBe(60);
    expect(bookableTripPrice(tour)?.price).toBe(60);
  });

  it('returns null when nothing is priced, so the page says "price on request"', () => {
    expect(tourFromPrice({ discountPrice: 0, bookingOptions: [{ price: 0 }] })).toBeNull();
    expect(bookableTripPrice({ discountPrice: 0, bookingOptions: [{ price: 0, timeSlots: [{ price: 0 }] }] })).toBeNull();
    expect(tourFromPrice({ discountPrice: 0 })).toBeNull();
    expect(bookableTripPrice({ discountPrice: 0 })).toBeNull();
    expect(bookableTripPrice({ price: 0 })).toBeNull();
  });

  it('does not advertise the bare tour price when every configured option is unpriced', () => {
    // Checkout sells only the options of a configured-option tour.
    expect(tourFromPrice({ discountPrice: 50, bookingOptions: [{ price: 0 }] })).toBeNull();
    expect(bookableTripPrice({ discountPrice: 50, bookingOptions: [{ price: 0 }] })).toBeNull();
  });

  it('keeps the tour headline price for every priced tour (no change for priced tours)', () => {
    const tour = { discountPrice: 45, originalPrice: 65, bookingOptions: [{ price: 45 }, { price: 120 }] };
    expect(bookableTripPrice(tour)).toEqual({ price: 45, originalPrice: 65, discountApplied: true });
    // Base 0 but options priced: the headline shows the cheapest real option.
    expect(bookableTripPrice({ discountPrice: 0, bookingOptions: [{ price: 0 }, { price: 75 }] })?.price).toBe(75);
  });

  it('applies the tour discount only to opted-in priced options and ignores a discounted 0', () => {
    const tour = {
      discountPercent: 50,
      bookingOptions: [{ price: 0, applyTourDiscount: true }, { price: 80, applyTourDiscount: true }],
    };
    expect(tourFromPrice(tour)).toEqual({ price: 40, originalPrice: 80, discountApplied: true });
  });

  it('skips a stored 0 listing summary and reads the tour itself', () => {
    const tour = {
      discountPrice: 60,
      bookingOptions: [{ price: 60 }, { price: 0 }],
      pricingSummaries: [{ tenantId: 'brand-a', fromPrice: 0 }],
    };
    expect(tourFromPrice(tour, 'brand-a')?.price).toBe(60);
    // A real stored summary still wins, and only for its own tenant.
    const summarised = { ...tour, pricingSummaries: [{ tenantId: 'brand-a', fromPrice: 55 }] };
    expect(tourFromPrice(summarised, 'brand-a')?.price).toBe(55);
    expect(tourFromPrice(summarised, 'brand-b')?.price).toBe(60);
  });

  it('sorts unpriced tours last in both directions', () => {
    const a = { price: 30, originalPrice: 30, discountApplied: false };
    const b = { price: 90, originalPrice: 90, discountApplied: false };
    const asc = [b, null, a].sort((x, y) => compareFromPrice(x, y, 'asc'));
    expect(asc).toEqual([a, b, null]);
    const desc = [a, null, b].sort((x, y) => compareFromPrice(x, y, 'desc'));
    expect(desc).toEqual([b, a, null]);
  });
});
