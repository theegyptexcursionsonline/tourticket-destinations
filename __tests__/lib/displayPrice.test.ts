import { tourFromPrice } from '@/lib/pricing/displayPrice';

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
    expect(tourFromPrice({ discountPrice: 380, originalPrice: 380 }).discountApplied).toBe(false);
  });
});
