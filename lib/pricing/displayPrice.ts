import { effectiveOptionPrice, DiscountablePricing, PricedOption } from './effectivePrice';

interface DisplayableOption extends PricedOption {
  timeSlots?: Array<{ price?: number | null }> | null;
}

export interface DisplayableTour extends DiscountablePricing {
  price?: number | null;
  discountPrice?: number | null;
  originalPrice?: number | null;
  bookingOptions?: DisplayableOption[] | null;
}

// The "from" price a card may advertise: the cheapest amount the booking
// sidebar could actually charge. With booking options present that is the
// minimum effective option price (tour discount applied only where the option
// opted in); without them the tour's own price stands, so payloads that do not
// ship options keep today's behaviour.
export function tourFromPrice(tour: DisplayableTour | null | undefined): {
  price: number;
  originalPrice: number;
  discountApplied: boolean;
} {
  const options = Array.isArray(tour?.bookingOptions)
    ? tour!.bookingOptions!.filter((option) => typeof option?.price === 'number' && Number.isFinite(option.price))
    : [];

  if (options.length > 0) {
    let cheapest = effectiveOptionPrice(tour, options[0]);
    for (const option of options.slice(1)) {
      const priced = effectiveOptionPrice(tour, option);
      if (priced.price < cheapest.price) cheapest = priced;
    }
    return cheapest;
  }

  const base = typeof tour?.discountPrice === 'number' ? tour.discountPrice : (tour?.price ?? 0);
  const original = typeof tour?.originalPrice === 'number' ? Math.max(tour.originalPrice, base) : base;
  return { price: base, originalPrice: original, discountApplied: original > base };
}
