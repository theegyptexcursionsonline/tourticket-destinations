import { clampAddOnQuantity, perPersonAddOnLimit } from '@/lib/bookings/bookingSelection';
import { hasChosenAddOnQuantities } from '@/lib/checkout/addOnPricing';
import { isUnitPricedType, type UnitCapacityOption } from '@/lib/bookings/unitPricing';
import {
  guestPricedSubtotal,
  guestPricesFromBase,
  resolveCatalogueGuestPrices,
  type GuestPriceSet,
} from '@/lib/revenue/guestPrices';

/**
 * One cart line, totalled the way the server charges it.
 *
 * The Stripe amount (lib/security/checkoutPricing.ts) prices a line from the
 * STORED tour: the adult price through authoritativeBasePrice, child/infant
 * through the selected departure's guest prices, whole-unit options per unit,
 * and per-person add-ons clamped to one per paying participant. Every surface
 * that displays or records a line total — cart sidebar, checkout page,
 * confirmation emails, receipt — must reach the same number, so they all go
 * through these helpers instead of keeping their own arithmetic.
 *
 * Where the prices come from, in order:
 *   1. `item.guestPrices` — the set the server resolved when it validated the
 *      cart (checkout route, webhook, receipt). Authoritative when present.
 *   2. The catalogue snapshot the cart line carries (`bookingOptions`,
 *      `discountPercent`, `availability`, `revenueGuestPrices`) resolved by the
 *      SAME function the server runs — the browser mirrors, it never invents.
 *   3. The network default: child half the adult price, infant free.
 */

export interface PricedLineAddOnDetail {
  title?: string;
  price?: number;
  perGuest?: boolean;
  quantity?: number;
  maxQuantity?: number;
}

export interface PricedLine {
  quantity?: number | null;
  childQuantity?: number | null;
  infantQuantity?: number | null;
  price?: number | null;
  discountPrice?: number | null;
  discountPercent?: number | null;
  selectedTime?: string | null;
  selectedBookingOption?: (UnitCapacityOption & { id?: string; pricingKey?: string; price?: number | null }) | null;
  selectedAddOns?: Record<string, number> | null;
  selectedAddOnDetails?: Record<string, PricedLineAddOnDetail> | null;
  addOnQuantityVersion?: number;
  guestPrices?: Partial<GuestPriceSet> | null;
  bookingOptions?: unknown;
  availability?: unknown;
  revenueGuestPrices?: unknown;
}

export interface GuestLine {
  guest: 'adult' | 'child' | 'infant';
  count: number;
  unitPrice: number;
  total: number;
  /** True when the unit price is not the network default for that guest type. */
  differsFromDefault: boolean;
}

const toMoney = (value: number) => Math.round(value * 100) / 100;
const wholeCount = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const completeSet = (value: unknown): value is GuestPriceSet => {
  if (!value || typeof value !== 'object') return false;
  const set = value as Record<string, unknown>;
  return (['adult', 'child', 'infant'] as const).every((guest) => finite(set[guest]) && (set[guest] as number) >= 0);
};

/** The adult price a line was quoted at: the option price, else the tour price. */
export function lineBasePrice(item: PricedLine | null | undefined): number {
  const candidates = [item?.selectedBookingOption?.price, item?.discountPrice, item?.price];
  for (const candidate of candidates) {
    if (finite(candidate) && candidate > 0) return candidate;
  }
  return 0;
}

/**
 * Adult/child/infant unit prices for one line. See the module comment for
 * the authority order. Never throws: a stale line whose option has since
 * been removed falls back to the network default rather than blanking the
 * cart — the server re-validates before any money moves.
 */
export function lineGuestPrices(item: PricedLine | null | undefined): GuestPriceSet {
  const basePrice = lineBasePrice(item);
  if (completeSet(item?.guestPrices)) return guestPricesFromBase(basePrice, item!.guestPrices);

  const hasSnapshot = Array.isArray(item?.bookingOptions) && item!.bookingOptions.length > 0;
  const hasTourLevel = item?.revenueGuestPrices !== undefined && item?.revenueGuestPrices !== null;
  if (hasSnapshot || hasTourLevel) {
    try {
      const resolved = resolveCatalogueGuestPrices(
        item as Parameters<typeof resolveCatalogueGuestPrices>[0],
        {
          selectedBookingOption: item?.selectedBookingOption
            ? { id: item.selectedBookingOption.id, pricingKey: item.selectedBookingOption.pricingKey }
            : null,
          selectedTime: item?.selectedTime ?? null,
        },
      );
      if (completeSet(resolved)) return resolved;
    } catch {
      // Option no longer in the snapshot — fall through to the default below.
    }
  }
  return guestPricesFromBase(basePrice);
}

/** The units of one add-on the line is billed for — the same clamp the authority applies. */
export function lineAddOnQuantity(item: PricedLine | null | undefined, addOnId: string): number {
  const requested = Number(item?.selectedAddOns?.[addOnId] ?? 0);
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  const detail = item?.selectedAddOnDetails?.[addOnId];
  if (!detail) return 0;
  if (detail.perGuest) {
    const payingParty = perPersonAddOnLimit(wholeCount(item?.quantity), wholeCount(item?.childQuantity));
    if (payingParty === 0) return 0;
    return hasChosenAddOnQuantities(item?.addOnQuantityVersion)
      ? clampAddOnQuantity(requested, payingParty)
      : payingParty;
  }
  const configuredMax = Number.isInteger(detail.maxQuantity) && Number(detail.maxQuantity) > 0
    ? Number(detail.maxQuantity)
    : 1;
  return Math.min(Math.floor(requested), configuredMax);
}

/** Add-ons total for one line. Items without stored detail are not billable and add nothing. */
export function lineAddOnsTotal(item: PricedLine | null | undefined): number {
  const selected = item?.selectedAddOns ?? {};
  let total = 0;
  for (const addOnId of Object.keys(selected)) {
    const detail = item?.selectedAddOnDetails?.[addOnId];
    const quantity = lineAddOnQuantity(item, addOnId);
    if (!detail || quantity <= 0) continue;
    total += (finite(detail.price) ? detail.price : 0) * quantity;
  }
  return toMoney(total);
}

/** Tour subtotal for one line (before add-ons, fees and discounts). */
export function lineTourSubtotal(item: PricedLine | null | undefined): number {
  return guestPricedSubtotal(
    item?.selectedBookingOption ?? null,
    lineGuestPrices(item),
    wholeCount(item?.quantity ?? 1) || 1,
    wholeCount(item?.childQuantity),
    wholeCount(item?.infantQuantity),
  );
}

/** Tour subtotal plus add-ons — what the cart and checkout page show per line. */
export function lineTotal(item: PricedLine | null | undefined): number {
  return toMoney(lineTourSubtotal(item) + lineAddOnsTotal(item));
}

/**
 * Per-guest-type breakdown of the tour subtotal for display. Whole-unit
 * options have no per-guest split and return an empty list; the caller shows
 * the unit line instead.
 */
export function lineGuestBreakdown(item: PricedLine | null | undefined): GuestLine[] {
  if (isUnitPricedType(item?.selectedBookingOption?.type)) return [];
  const prices = lineGuestPrices(item);
  const defaults = guestPricesFromBase(prices.adult);
  const counts = {
    adult: wholeCount(item?.quantity ?? 1) || 1,
    child: wholeCount(item?.childQuantity),
    infant: wholeCount(item?.infantQuantity),
  };
  return (['adult', 'child', 'infant'] as const)
    .filter((guest) => counts[guest] > 0)
    .map((guest) => ({
      guest,
      count: counts[guest],
      unitPrice: prices[guest],
      total: toMoney(prices[guest] * counts[guest]),
      differsFromDefault: guest !== 'adult' && toMoney(prices[guest]) !== toMoney(defaults[guest]),
    }));
}
