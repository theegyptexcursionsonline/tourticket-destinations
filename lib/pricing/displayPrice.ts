import {
  effectiveOptionPrice,
  effectiveTourPrice,
  isRealPrice,
  DiscountablePricing,
  PricedOption,
} from './effectivePrice';

interface DisplayableOption extends PricedOption {
  timeSlots?: Array<{ price?: number | null }> | null;
}

export interface DisplayableTour extends DiscountablePricing {
  price?: number | null;
  discountPrice?: number | null;
  originalPrice?: number | null;
  bookingOptions?: DisplayableOption[] | null;
  pricingSummaries?: Array<{
    tenantId: string;
    fromPrice?: number | null;
    currency?: string;
    version?: number;
    validThrough?: string | Date | null;
  }> | null;
}

export interface DisplayedPrice {
  price: number;
  originalPrice: number;
  discountApplied: boolean;
}

/**
 * The cheapest real quote across the tour's booking options and their start
 * times, or null when no option has one. A 0 quote (an option left at its 0
 * starting base, or a start time priced 0) is never the cheapest price: it
 * cannot be booked, so advertising it showed the trip at $0.00.
 */
export function lowestOptionPrice(tour: DisplayableTour | null | undefined): DisplayedPrice | null {
  const options = Array.isArray(tour?.bookingOptions)
    ? tour!.bookingOptions!.filter((option) => typeof option?.price === 'number' && Number.isFinite(option.price))
    : [];
  let cheapest: DisplayedPrice | null = null;
  for (const option of options) {
    const slots = Array.isArray(option.timeSlots) && option.timeSlots.length > 0
      ? option.timeSlots
      : [undefined];
    for (const slot of slots) {
      const priced = effectiveOptionPrice(tour, option, slot);
      if (!isRealPrice(priced.price)) continue;
      if (!cheapest || priced.price < cheapest.price) cheapest = priced;
    }
  }
  return cheapest;
}

const hasOptions = (tour: DisplayableTour | null | undefined) =>
  Array.isArray(tour?.bookingOptions)
  && tour!.bookingOptions!.some((option) => typeof option?.price === 'number' && Number.isFinite(option.price));

// The "from" price a card may advertise: the cheapest amount the booking
// sidebar could actually charge. With booking options present that is the
// minimum real effective option price (tour discount applied only where the
// option opted in); without them the tour's own price stands, so payloads that
// do not ship options keep today's behaviour. Null when nothing is priced, so
// the card says "price on request" instead of $0.00.
export function tourFromPrice(tour: DisplayableTour | null | undefined, tenantId?: string): DisplayedPrice | null {
  const tenantSummary = tenantId && Array.isArray(tour?.pricingSummaries)
    ? tour!.pricingSummaries!.find((summary) => summary.tenantId === tenantId)
    : undefined;
  const projected = Number(tenantSummary?.fromPrice);
  const validThrough = tenantSummary?.validThrough ? new Date(tenantSummary.validThrough) : null;
  // A stored summary of 0 was built from an unpriced option; skip it and read
  // the tour itself.
  if (
    isRealPrice(projected)
    && (!validThrough || (!Number.isNaN(validThrough.getTime()) && validThrough.getTime() >= Date.now()))
  ) {
    return { price: projected, originalPrice: projected, discountApplied: false };
  }

  // A configured-option tour sells only its options (checkout has no implicit
  // standard product for it), so with none priced it has no "from" price.
  if (hasOptions(tour)) return lowestOptionPrice(tour);

  const base = typeof tour?.discountPrice === 'number' ? tour.discountPrice : (tour?.price ?? 0);
  if (!isRealPrice(base)) return null;
  const original = typeof tour?.originalPrice === 'number' ? Math.max(tour.originalPrice, base) : base;
  return { price: base, originalPrice: original, discountApplied: original > base };
}

/**
 * The per-person price the trip page headline, the booking panel headline and
 * the phone booking bar show. With priced options it is the cheapest real
 * option price, shown with the tour base and its original price when the two
 * agree; without options the tour's own base price stands;
 * null when nothing is priced (no real base and no priced option, or options
 * configured and none of them priced), so the page says "price on request".
 */
export function bookableTripPrice(tour: DisplayableTour | null | undefined): DisplayedPrice | null {
  const cheapestOption = hasOptions(tour) ? lowestOptionPrice(tour) : null;
  // Options configured but none priced: nothing on this trip can be booked.
  if (hasOptions(tour) && !cheapestOption) return null;
  const base = effectiveTourPrice(tour);
  // With priced options, the headline is what the cheapest option sells at:
  // a base price that no option sells at put a per-person figure in the
  // booking panel that its cards and total never reached. A base equal to
  // that cheapest option keeps standing (with its original price) as before.
  if (cheapestOption && !(isRealPrice(base.price) && Math.abs(base.price - cheapestOption.price) < 0.005)) {
    return cheapestOption;
  }
  if (isRealPrice(base.price)) return base;
  return cheapestOption;
}

/** Price sort for listings: unpriced tours go last in either direction. */
export function compareFromPrice(a: DisplayedPrice | null, b: DisplayedPrice | null, direction: 'asc' | 'desc'): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return direction === 'asc' ? a.price - b.price : b.price - a.price;
}
