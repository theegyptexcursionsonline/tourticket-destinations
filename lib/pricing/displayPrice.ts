import { effectiveOptionPrice, DiscountablePricing, PricedOption } from './effectivePrice';

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

// The "from" price a card may advertise: the cheapest amount the booking
// sidebar could actually charge. With booking options present that is the
// minimum effective option price (tour discount applied only where the option
// opted in); without them the tour's own price stands, so payloads that do not
// ship options keep today's behaviour.
export function tourFromPrice(tour: DisplayableTour | null | undefined, tenantId?: string): {
  price: number;
  originalPrice: number;
  discountApplied: boolean;
} {
  const tenantSummary = tenantId && Array.isArray(tour?.pricingSummaries)
    ? tour!.pricingSummaries!.find((summary) => summary.tenantId === tenantId)
    : undefined;
  const projected = Number(tenantSummary?.fromPrice);
  const validThrough = tenantSummary?.validThrough ? new Date(tenantSummary.validThrough) : null;
  if (
    Number.isFinite(projected)
    && projected >= 0
    && (!validThrough || (!Number.isNaN(validThrough.getTime()) && validThrough.getTime() >= Date.now()))
  ) {
    return { price: projected, originalPrice: projected, discountApplied: false };
  }

  const options = Array.isArray(tour?.bookingOptions)
    ? tour!.bookingOptions!.filter((option) => typeof option?.price === 'number' && Number.isFinite(option.price))
    : [];

  if (options.length > 0) {
    const chargeablePrices = options.flatMap((option) => {
      const slots = Array.isArray(option.timeSlots) && option.timeSlots.length > 0
        ? option.timeSlots
        : [undefined];
      return slots.map((slot) => effectiveOptionPrice(tour, option, slot));
    });
    let cheapest = chargeablePrices[0];
    for (const priced of chargeablePrices.slice(1)) {
      if (priced.price < cheapest.price) cheapest = priced;
    }
    return cheapest;
  }

  const base = typeof tour?.discountPrice === 'number' ? tour.discountPrice : (tour?.price ?? 0);
  const original = typeof tour?.originalPrice === 'number' ? Math.max(tour.originalPrice, base) : base;
  return { price: base, originalPrice: original, discountApplied: original > base };
}
