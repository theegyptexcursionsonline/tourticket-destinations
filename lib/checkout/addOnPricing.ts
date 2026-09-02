import { clampAddOnQuantity, perPersonAddOnLimit } from '@/lib/bookings/bookingSelection';

export type AddOnPricingMethod = 'per_unit' | 'per_person';

type AddOnLike = {
  pricingMethod?: string | null;
  perGuest?: boolean | null;
  category?: string | null;
};

/** Resolve pricing while keeping legacy add-ons backwards compatible. */
export function isPerPersonAddOn(addOn: AddOnLike): boolean {
  if (addOn.pricingMethod === 'per_person') return true;
  if (addOn.pricingMethod === 'per_unit') return false;
  if (typeof addOn.perGuest === 'boolean') return addOn.perGuest;
  return addOn.category === 'Food';
}

export function resolveAddOnPricingMethod(addOn: AddOnLike): AddOnPricingMethod {
  return isPerPersonAddOn(addOn) ? 'per_person' : 'per_unit';
}

export type StoredAddOnDetail = AddOnLike & {
  quantity?: number | null;
};

const positiveInt = (value: unknown): number => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Units a persisted add-on line was actually billed for.
 *
 * New bookings record the server-authoritative chosen quantity on the detail.
 * Legacy per-person bookings do not, and were billed for every paying guest,
 * so they retain that historical interpretation instead of being re-priced.
 */
export function storedAddOnUnits(
  detail: StoredAddOnDetail | null | undefined,
  storedQuantity: unknown,
  adults: number,
  children: number,
): number {
  const quantity = positiveInt(storedQuantity);
  if (!detail?.perGuest) return quantity;
  const limit = perPersonAddOnLimit(adults, children);
  const recorded = positiveInt(detail.quantity);
  if (recorded > 0) return clampAddOnQuantity(recorded, limit);
  return positiveInt(adults) + positiveInt(children);
}
