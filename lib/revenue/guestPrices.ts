import { applyDiscountPercent } from '@/lib/pricing/effectivePrice';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';
import { optionSubtotal } from '@/lib/bookings/optionSubtotal';
import { isUnitPricedType, type UnitCapacityOption } from '@/lib/bookings/unitPricing';

/**
 * Guest (adult / child / infant) prices — the "Guest prices for RevenuePilot"
 * block on the tour, per booking option, and per departure slot.
 *
 * Storage shape (see lib/models/Tour.ts):
 *   tour.revenueGuestPrices            { adult, child, infant }   complete set or absent
 *   option.guestPrices                 { adult, child, infant }   complete set or absent
 *   availability.slots[].guestPrices   { child?, infant? }        independent overrides
 *   option.timeSlots[].guestPrices     { child?, infant? }        independent overrides
 *
 * Resolution order for a charge: slot override → option/tour set → network
 * default (child = half the adult price, infant free). The same percentage
 * that discounts the adult price is applied to every explicit guest price so
 * the sidebar quote and the Stripe amount cannot drift.
 */

export type GuestPriceSet = { adult: number; child: number; infant: number };
export type SlotGuestPrices = { child?: number; infant?: number };

const toMoney = (value: number) => Math.round(value * 100) / 100;

const finiteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const blank = (value: unknown) => value === undefined || value === null || String(value).trim() === '';

export function guestPricesEqual(left: unknown, right: unknown) {
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  return (['adult', 'child', 'infant'] as const).every((guest) => {
    const first = Number((left as Record<string, unknown>)[guest]);
    const second = Number((right as Record<string, unknown>)[guest]);
    return Number.isFinite(first) && Number.isFinite(second) && first === second;
  });
}

/**
 * RevenuePilot requires an explicit, complete catalogue snapshot. Legacy tours
 * remain readable through the established half-price-child/free-infant rule,
 * but `verified` stays false until all three values are deliberately stored.
 */
export function explicitCatalogueGuestPrices(adult: number, explicit?: Partial<GuestPriceSet> | null) {
  const candidate = { adult: Number(explicit?.adult), child: Number(explicit?.child), infant: Number(explicit?.infant) };
  const verified = (['adult', 'child', 'infant'] as const).every((guest) => finiteNonNegative(candidate[guest]))
    && candidate.adult === adult;
  return { prices: verified ? candidate : { adult, child: toMoney(adult / 2), infant: 0 }, verified };
}

/**
 * Export a catalogue guest-price set after applying the same tour discount as
 * checkout. Stored explicit prices are authored against the undiscounted
 * catalogue adult, so verification must happen before the discount is
 * applied. Comparing them with the already-discounted adult would incorrectly
 * discard deliberate child and infant prices.
 */
export function effectiveCatalogueGuestPrices(input: {
  catalogueAdult: number;
  effectiveAdult: number;
  explicit?: Partial<GuestPriceSet> | null;
  discountPercent?: number | null;
  applyDiscount?: boolean;
}) {
  const explicit = explicitCatalogueGuestPrices(input.catalogueAdult, input.explicit);
  if (!explicit.verified) {
    return {
      prices: { adult: input.effectiveAdult, child: toMoney(input.effectiveAdult / 2), infant: 0 },
      verified: false,
    };
  }
  return {
    prices: effectiveSlotGuestPrices({
      adult: input.effectiveAdult,
      base: explicit.prices,
      discountPercent: input.discountPercent,
      applyDiscount: input.applyDiscount,
    }),
    verified: true,
  };
}

/**
 * Turn an editor/API payload into a complete guest-price set, or null.
 * Both child and infant must be present and valid; adult always mirrors the
 * price it is saved with (the base/option price), never a submitted value.
 * Returns null for blank, partial, negative or non-numeric input so a
 * half-configured set can never be stored.
 */
export function normalizeGuestPriceSet(adult: unknown, value: unknown): GuestPriceSet | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (blank(adult) || blank(raw.child) || blank(raw.infant)) return null;
  const set = { adult: Number(adult), child: Number(raw.child), infant: Number(raw.infant) };
  return (['adult', 'child', 'infant'] as const).every((guest) => finiteNonNegative(set[guest]))
    ? set
    : null;
}

/** True when exactly one of child/infant is filled — the editor must refuse to save. */
export function hasPartialGuestPrices(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const raw = value as Record<string, unknown>;
  return blank(raw.child) !== blank(raw.infant);
}

/**
 * Clean a slot's independent child/infant overrides. Blank or invalid values
 * are dropped (inherit); an empty result becomes undefined so nothing is
 * stored for a slot with no overrides.
 */
export function cleanSlotGuestPrices(value: unknown): SlotGuestPrices | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const cleaned: SlotGuestPrices = {};
  for (const guest of ['child', 'infant'] as const) {
    if (blank(raw[guest])) continue;
    const amount = Number(raw[guest]);
    if (finiteNonNegative(amount) && amount <= 999999) cleaned[guest] = amount;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/**
 * Resolve a slot's customer prices from stored catalogue values. Slot child
 * and infant prices are independent optional overrides; a blank value inherits
 * the option/tour guest price. The same percentage that changes the adult slot
 * price is applied to every explicit guest price, preventing display/checkout
 * drift.
 */
export function effectiveSlotGuestPrices(input: {
  adult: number;
  base?: Partial<GuestPriceSet> | null;
  slot?: { guestPrices?: SlotGuestPrices | null } | null;
  discountPercent?: number | null;
  applyDiscount?: boolean;
}): GuestPriceSet {
  const price = (value: number) => input.applyDiscount
    ? applyDiscountPercent(value, input.discountPercent)
    : toMoney(value);
  const childSource = finiteNonNegative(input.slot?.guestPrices?.child)
    ? input.slot!.guestPrices!.child!
    : (finiteNonNegative(input.base?.child) ? input.base!.child! : null);
  const infantSource = finiteNonNegative(input.slot?.guestPrices?.infant)
    ? input.slot!.guestPrices!.infant!
    : (finiteNonNegative(input.base?.infant) ? input.base!.infant! : null);
  return {
    adult: input.adult,
    child: childSource === null ? toMoney(input.adult * 50 / 100) : price(childSource),
    infant: infantSource === null ? 0 : price(infantSource),
  };
}

/**
 * The network default when nothing explicit is stored: child half, infant
 * free. Used by surfaces that only have a base price (legacy summaries).
 */
export function guestPricesFromBase(adult: number, explicit?: Partial<GuestPriceSet> | null): GuestPriceSet {
  const base = finiteNonNegative(adult) ? adult : 0;
  if (
    explicit
    && finiteNonNegative(explicit.adult)
    && finiteNonNegative(explicit.child)
    && finiteNonNegative(explicit.infant)
  ) {
    return { adult: explicit.adult, child: explicit.child, infant: explicit.infant };
  }
  return { adult: base, child: toMoney(base / 2), infant: 0 };
}

interface StoredGuestPricedOption {
  id?: string;
  _id?: unknown;
  pricingKey?: string;
  type?: string;
  price?: number;
  applyTourDiscount?: boolean;
  guestPrices?: Partial<GuestPriceSet> | null;
  timeSlots?: Array<{ time?: string; price?: number; guestPrices?: SlotGuestPrices | null }>;
}

interface StoredGuestPricedTour {
  discountPercent?: number;
  discountPrice?: number;
  price?: number;
  revenueGuestPrices?: Partial<GuestPriceSet> | null;
  bookingOptions?: StoredGuestPricedOption[];
  availability?: { slots?: Array<{ time?: string; price?: number; guestPrices?: SlotGuestPrices | null }> };
}

interface GuestPricedCartItem {
  selectedBookingOption?: { id?: string; pricingKey?: string } | null;
  selectedTime?: string | null;
}

/**
 * The adult/child/infant prices one guest of a cart item may be charged,
 * derived from the STORED tour only — the option id and departure time are the
 * only things read from the cart. The adult price is the same authoritative
 * base every other surface charges; child/infant follow the selected
 * departure's override, then the option/tour set, then the network default.
 */
export function resolveCatalogueGuestPrices(
  tour: StoredGuestPricedTour | null | undefined,
  cartItem: GuestPricedCartItem | null | undefined,
): GuestPriceSet {
  const adult = authoritativeBasePrice(tour, cartItem);
  const requestedTime = cartItem?.selectedTime ? String(cartItem.selectedTime) : null;
  const requestedOptionId = cartItem?.selectedBookingOption?.id;
  const requestedPricingKey = cartItem?.selectedBookingOption?.pricingKey;
  const options = Array.isArray(tour?.bookingOptions) ? tour!.bookingOptions! : [];
  const option = (requestedPricingKey
    ? options.find((candidate) => String(candidate.pricingKey ?? '') === String(requestedPricingKey))
    : undefined)
    ?? (requestedOptionId
      ? options.find((candidate) => String(candidate.id ?? candidate._id ?? '') === String(requestedOptionId))
      : undefined);

  if (option) {
    const slot = Array.isArray(option.timeSlots) && requestedTime
      ? option.timeSlots.find((entry) => entry.time === requestedTime)
      : undefined;
    return effectiveSlotGuestPrices({
      adult,
      base: option.guestPrices,
      slot,
      discountPercent: tour?.discountPercent,
      applyDiscount: Boolean(option.applyTourDiscount),
    });
  }

  const universalSlot = Array.isArray(tour?.availability?.slots) && requestedTime
    ? tour!.availability!.slots!.find((entry) => entry.time === requestedTime)
    : undefined;
  return effectiveSlotGuestPrices({
    adult,
    base: tour?.revenueGuestPrices,
    slot: universalSlot,
    discountPercent: tour?.discountPercent,
    applyDiscount: true,
  });
}

/**
 * The tour subtotal for one cart line using explicit guest prices. Whole-unit
 * options (Per Couple / Family / Group) still price a WHOLE unit through the
 * shared optionSubtotal rule — guest prices never apply per head there. Per
 * Person options charge each guest type its own price.
 */
export function guestPricedSubtotal(
  option: UnitCapacityOption | null | undefined,
  prices: GuestPriceSet,
  adults: number,
  children: number,
  infants = 0,
): number {
  const adultCount = Math.max(0, Math.floor(Number(adults) || 0));
  const childCount = Math.max(0, Math.floor(Number(children) || 0));
  const infantCount = Math.max(0, Math.floor(Number(infants) || 0));
  if (option && isUnitPricedType(option.type)) {
    return optionSubtotal(option, prices.adult, adultCount, childCount, infantCount);
  }
  return toMoney(prices.adult * adultCount + prices.child * childCount + prices.infant * infantCount);
}

/**
 * Drop option time slots that no longer exist in the tour's universal
 * availability. The editor only renders the universal slots, so a stale slot
 * an option still carries is invisible to the admin — pruning it before save
 * keeps the form and the API's slot-validity guard in agreement.
 */
export function pruneBookingOptionTimeSlots<TOption extends { timeSlots?: Array<{ time?: string }> }>(
  bookingOptions: readonly TOption[] | null | undefined,
  availabilitySlots: ReadonlyArray<{ time?: string }> | null | undefined,
): TOption[] {
  const allowed = new Set((availabilitySlots || []).map((slot) => String(slot?.time || '')).filter(Boolean));
  return (bookingOptions || []).map((option) => {
    if (!Array.isArray(option.timeSlots)) return option;
    return {
      ...option,
      timeSlots: option.timeSlots.filter((slot) => typeof slot?.time === 'string' && allowed.has(slot.time)),
    };
  });
}

/**
 * Booking-option time slots must be a strict subset of the tour's universal
 * availability; a stale or hand-built request cannot revive a removed slot.
 */
export function hasOnlyConfiguredTimeSlots(
  optionSlots: unknown,
  availabilitySlots: Array<{ time?: string }> | undefined | null,
): boolean {
  if (!Array.isArray(optionSlots) || optionSlots.length === 0) return true;
  const configured = new Set((availabilitySlots || []).map((slot) => String(slot?.time || '')).filter(Boolean));
  return optionSlots.every((slot) => {
    const time = typeof slot === 'object' && slot !== null ? String((slot as { time?: unknown }).time || '') : '';
    return Boolean(time) && configured.has(time);
  });
}

/**
 * Server-side clean for one booking option's guest prices: the option set is
 * normalised against the option's own price (or nulled — null unsets a stale
 * stored set, undefined would leave it behind on $set), and each time slot's
 * child/infant overrides are cleaned independently.
 */
export function cleanBookingOptionGuestPrices<T extends Record<string, unknown>>(option: T): T {
  const cleaned: Record<string, unknown> = { ...option };
  if ('guestPrices' in cleaned) {
    cleaned.guestPrices = normalizeGuestPriceSet(cleaned.price, cleaned.guestPrices);
  }
  if (Array.isArray(cleaned.timeSlots)) {
    cleaned.timeSlots = cleaned.timeSlots.map((slot) => {
      if (!slot || typeof slot !== 'object') return slot;
      const { guestPrices, ...rest } = slot as Record<string, unknown>;
      const cleanedSlot = cleanSlotGuestPrices(guestPrices);
      return cleanedSlot ? { ...rest, guestPrices: cleanedSlot } : rest;
    });
  }
  return cleaned as T;
}

/** Server-side clean for the tour's universal availability slots. */
export function cleanAvailabilitySlotGuestPrices<T extends { slots?: unknown }>(availability: T): T {
  if (!availability || !Array.isArray(availability.slots)) return availability;
  return {
    ...availability,
    slots: availability.slots.map((slot) => {
      if (!slot || typeof slot !== 'object') return slot;
      const { guestPrices, ...rest } = slot as Record<string, unknown>;
      const cleanedSlot = cleanSlotGuestPrices(guestPrices);
      return cleanedSlot ? { ...rest, guestPrices: cleanedSlot } : rest;
    }),
  };
}
