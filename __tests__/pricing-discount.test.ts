import { effectiveOptionPrice, applyDiscountPercent, normalizeDiscountPercent } from '@/lib/pricing/effectivePrice';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';

describe('a tour discount is a percentage that options opt into', () => {
  const tour = { discountPercent: 20 };

  it('leaves an option alone unless it opted in', () => {
    expect(effectiveOptionPrice(tour, { price: 100 })).toEqual({
      price: 100, originalPrice: 100, discountApplied: false,
    });
  });

  it('discounts an option that opted in', () => {
    expect(effectiveOptionPrice(tour, { price: 100, applyTourDiscount: true })).toEqual({
      price: 80, originalPrice: 100, discountApplied: true,
    });
  });

  it('lets one option be discounted while another is not', () => {
    const discounted = effectiveOptionPrice(tour, { price: 50, applyTourDiscount: true });
    const fullPrice = effectiveOptionPrice(tour, { price: 50 });
    expect(discounted.price).toBe(40);
    expect(fullPrice.price).toBe(50);
  });

  it('applies the discount to a time slot that sets its own price', () => {
    const result = effectiveOptionPrice(tour, { price: 100, applyTourDiscount: true }, { price: 200 });
    expect(result).toEqual({ price: 160, originalPrice: 200, discountApplied: true });
  });

  it('falls back to the option price when a slot leaves price blank', () => {
    expect(effectiveOptionPrice(tour, { price: 100, applyTourDiscount: true }, { price: null }).price).toBe(80);
  });

  it('reports no discount when the tour has none, so no false strikethrough', () => {
    expect(effectiveOptionPrice({}, { price: 100, applyTourDiscount: true })).toEqual({
      price: 100, originalPrice: 100, discountApplied: false,
    });
  });

  it('rounds to cents rather than accumulating fractions', () => {
    expect(applyDiscountPercent(99.99, 15)).toBe(84.99);
  });

  it('refuses nonsense percentages instead of producing negative prices', () => {
    expect(normalizeDiscountPercent(-10)).toBe(0);
    expect(normalizeDiscountPercent(150)).toBe(100);
    expect(normalizeDiscountPercent(undefined)).toBe(0);
    expect(applyDiscountPercent(100, 150)).toBe(0);
  });
});

describe('the server prices from the stored tour, not the submitted cart', () => {
  const tour = {
    discountPercent: 25,
    discountPrice: 90,
    bookingOptions: [
      { id: 'opt-a', price: 200, applyTourDiscount: true, timeSlots: [{ time: '09:00', price: 400 }] },
      { id: 'opt-b', price: 120 },
    ],
  };

  it('ignores a price the browser claims for the option', () => {
    const price = authoritativeBasePrice(tour, {
      selectedBookingOption: { id: 'opt-a', price: 1 },
    });
    expect(price).toBe(150);
  });

  it('honours a time slot price and still applies the discount', () => {
    const price = authoritativeBasePrice(tour, {
      selectedBookingOption: { id: 'opt-a', price: 1 },
      selectedTime: '09:00',
    });
    expect(price).toBe(300);
  });

  it('charges full price for an option that did not opt in', () => {
    expect(authoritativeBasePrice(tour, { selectedBookingOption: { id: 'opt-b', price: 5 } })).toBe(120);
  });

  it('uses the tour price when no option was chosen', () => {
    expect(authoritativeBasePrice(tour, { selectedBookingOption: null })).toBe(90);
  });

  it('never makes an unrecognised item free', () => {
    const price = authoritativeBasePrice(
      { bookingOptions: [] },
      { selectedBookingOption: { id: 'gone', price: 77 }, discountPrice: 55 },
    );
    expect(price).toBeGreaterThan(0);
  });
});
