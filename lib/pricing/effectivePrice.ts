/**
 * One place that decides what a booking option actually costs.
 *
 * A tour carries a discount as a percentage. Each booking option opts in to it
 * with `applyTourDiscount`, so an operator can discount some options and leave
 * others at full price. A time slot may override the option's base price, and
 * inherits it when left blank.
 *
 * Every surface that shows or charges a price must call this — the storefront
 * so the customer sees the right number, and the server so the customer is
 * charged that same number. Duplicating the arithmetic is how a quote and a
 * charge drift apart.
 */

export interface DiscountablePricing {
  /** Whole-number percentage off, e.g. 15 for 15%. */
  discountPercent?: number | null;
}

export interface PricedOption {
  price?: number | null;
  applyTourDiscount?: boolean | null;
}

export interface PricedTimeSlot {
  price?: number | null;
}

/** Round to cents so repeated percentage maths cannot drift. */
const toMoney = (value: number) => Math.round(value * 100) / 100;

export function normalizeDiscountPercent(percent?: number | null): number {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return 0;
  if (percent <= 0) return 0;
  return Math.min(percent, 100);
}

export function applyDiscountPercent(amount: number, percent?: number | null): number {
  const pct = normalizeDiscountPercent(percent);
  if (pct === 0) return toMoney(amount);
  return toMoney(amount * (1 - pct / 100));
}

/**
 * What this option costs, for a specific time slot when one is given.
 * Returns both the charged price and the pre-discount price, so a strikethrough
 * only ever renders when there is a real reduction to show.
 */
export function effectiveOptionPrice(
  tour: DiscountablePricing | null | undefined,
  option: PricedOption | null | undefined,
  timeSlot?: PricedTimeSlot | null,
): { price: number; originalPrice: number; discountApplied: boolean } {
  const slotPrice = typeof timeSlot?.price === 'number' && Number.isFinite(timeSlot.price)
    ? timeSlot.price
    : null;
  const base = slotPrice ?? (typeof option?.price === 'number' ? option.price : 0);
  const originalPrice = toMoney(Math.max(base, 0));

  if (!option?.applyTourDiscount) {
    return { price: originalPrice, originalPrice, discountApplied: false };
  }

  const price = applyDiscountPercent(originalPrice, tour?.discountPercent);
  return { price, originalPrice, discountApplied: price < originalPrice };
}
