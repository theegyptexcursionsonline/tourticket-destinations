import { clampAddOnQuantity, perPersonAddOnLimit } from '@/lib/bookings/bookingSelection';
import { guestPricedSubtotal, guestPricesFromBase, type GuestPriceSet } from '@/lib/revenue/guestPrices';
import type { UnitCapacityOption } from '@/lib/bookings/unitPricing';

export type RecoveryCartItem = {
  /** Add-on quantity contract. 1 = q is chosen units; missing = legacy whole paying party. */
  aqv?: number;
  a?: number;
  c?: number;
  n?: number;
  bp?: number;
  gp?: Partial<GuestPriceSet> | [number?, number?, number?];
  us?: number;
  up?: number;
  ao?: Array<{ id?: string; q?: number; p?: number; pg?: boolean; t?: string }>;
};

export type PaidCartSummaryItem = RecoveryCartItem & {
  t?: string;
  d?: string;
  tm?: string;
  bo?: string;
  ok?: string;
  bot?: string;
  boty?: string;
  pv?: number;
  psv?: string;
  pe?: string;
  po?: string;
};

const whole = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function recoveryGuestPrices(item: RecoveryCartItem, fallback?: GuestPriceSet): GuestPriceSet {
  const raw = Array.isArray(item.gp)
    ? { adult: item.gp[0], child: item.gp[1], infant: item.gp[2] }
    : item.gp;
  const adult = Number(raw?.adult ?? fallback?.adult ?? item.bp ?? 0);
  const candidate = {
    adult,
    child: Number(raw?.child ?? fallback?.child ?? adult / 2),
    infant: Number(raw?.infant ?? fallback?.infant ?? 0),
  };
  if (Object.values(candidate).some((price) => !Number.isFinite(price) || price < 0)) {
    throw new Error('Invalid paid price snapshot');
  }
  return guestPricesFromBase(candidate.adult, candidate);
}

/**
 * Preserve payments that were already in flight during the add-on quantity
 * migration. New records carry aqv=1 and q is the chosen unit count. Legacy
 * records have no marker and retain the old whole-paying-party semantics.
 */
export function recoveryAddOnUnits(item: RecoveryCartItem, addOn: { q?: number; pg?: boolean }): number {
  const requested = whole(addOn.q);
  if (!addOn.pg || requested === 0) return requested;
  if (item.aqv === 1) {
    return clampAddOnQuantity(requested, perPersonAddOnLimit(whole(item.a), whole(item.c)));
  }
  return Math.max(1, whole(item.a) + whole(item.c));
}

export function recoveryTourSubtotal(
  item: RecoveryCartItem,
  option: UnitCapacityOption | null | undefined,
  prices: GuestPriceSet,
): number {
  if (item.us !== undefined && Number.isFinite(Number(item.up)) && Number(item.up) >= 0) {
    const participants = Math.max(1, whole(item.a) + whole(item.c) + whole(item.n));
    const unitSize = Number(item.us);
    const units = unitSize >= 1 ? Math.ceil(participants / unitSize) : 1;
    return roundMoney(units * Number(item.up));
  }
  return guestPricedSubtotal(option, prices, Math.max(1, whole(item.a)), whole(item.c), whole(item.n));
}

export function recoveryAddOnsTotal(item: RecoveryCartItem): number {
  return roundMoney((item.ao || []).reduce((total, addOn) => {
    const price = Number(addOn.p ?? 0);
    if (!Number.isFinite(price) || price < 0) throw new Error('Invalid paid add-on snapshot');
    return total + price * recoveryAddOnUnits(item, addOn);
  }, 0));
}

const completePaidGuestSnapshot = (value: PaidCartSummaryItem['gp']) => {
  const prices = Array.isArray(value)
    ? value.slice(0, 3)
    : value && typeof value === 'object'
      ? [value.adult, value.child, value.infant]
      : [];
  return prices.length === 3 && prices.every((price) => Number.isFinite(Number(price)) && Number(price) >= 0);
};

const validDateOnly = (value: unknown) => {
  const raw = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw;
};

/**
 * Rebuild one cart line from the server-created snapshot stored on a settled
 * Stripe intent. Live inventory is checked by the booking writer afterwards,
 * but catalogue edits made after payment must not re-price that payment.
 */
export function recoverPaidCartLine(
  item: PaidCartSummaryItem,
  tour: { id: string; title: string; originalPrice?: number },
) {
  if (!tour.id || item.t !== tour.id || !validDateOnly(item.d) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(item.tm || ''))) {
    throw new Error('Invalid paid cart snapshot');
  }
  if (!completePaidGuestSnapshot(item.gp)) throw new Error('Incomplete paid price snapshot');

  const adults = Math.max(1, whole(item.a));
  const children = whole(item.c);
  const infants = whole(item.n);
  if (adults + children + infants > 150) throw new Error('Invalid paid participant snapshot');
  const guestPrices = recoveryGuestPrices(item);
  const standard = (!item.bo || ['standard-default', 'standard-tour'].includes(item.bo))
    && (!item.ok || item.ok === 'standard');
  if (!standard && (!item.bo || !item.ok || !item.bot || !item.boty)) {
    throw new Error('Incomplete paid option snapshot');
  }

  const selectedAddOns: Record<string, number> = {};
  const selectedAddOnDetails: Record<string, { title: string; price: number; perGuest: boolean; quantity: number }> = {};
  for (const addOn of item.ao || []) {
    const id = String(addOn.id || '');
    const price = Number(addOn.p);
    const quantity = recoveryAddOnUnits(item, addOn);
    if (!id || id in selectedAddOns || !Number.isFinite(price) || price < 0 || quantity < 1) throw new Error('Invalid paid add-on snapshot');
    selectedAddOns[id] = quantity;
    selectedAddOnDetails[id] = {
      title: String(addOn.t || 'Add-on'),
      price,
      perGuest: Boolean(addOn.pg),
      quantity,
    };
  }

  const unitSize = item.us === undefined ? undefined : Number(item.us);
  const unitPrice = item.up === undefined ? undefined : Number(item.up);
  if (
    (unitSize !== undefined && (!Number.isInteger(unitSize) || unitSize < 0))
    || (unitPrice !== undefined && (!Number.isFinite(unitPrice) || unitPrice < 0))
  ) throw new Error('Invalid paid unit-price snapshot');

  const selectedBookingOption = standard
    ? {
        id: 'standard-default', pricingKey: 'standard', title: `${tour.title} - Standard Experience`,
        type: 'Per Person', price: guestPrices.adult, originalPrice: tour.originalPrice,
      }
    : {
        id: String(item.bo), pricingKey: String(item.ok), title: String(item.bot), type: String(item.boty),
        price: guestPrices.adult, originalPrice: tour.originalPrice,
        ...(unitSize !== undefined && unitSize > 0 ? { minCapacity: unitSize } : {}),
      };
  const cartItem = {
    _id: tour.id,
    id: tour.id,
    title: tour.title,
    selectedDate: item.d,
    selectedTime: item.tm,
    quantity: adults,
    childQuantity: children,
    infantQuantity: infants,
    price: guestPrices.adult,
    discountPrice: guestPrices.adult,
    guestPrices,
    selectedBookingOption,
    selectedAddOns,
    selectedAddOnDetails,
    addOnQuantityVersion: 1 as const,
    unitPricing: unitSize !== undefined && unitPrice !== undefined ? { unitSize, unitPrice } : null,
    priceVersion: Number(item.pv || 0),
    priceSourceVersion: item.psv || null,
    priceExecutionId: item.pe || null,
    priceOverrideId: item.po || null,
    priceSource: item.po ? 'override' : 'catalogue',
  };
  return {
    cartItem,
    lineSubtotal: roundMoney(recoveryTourSubtotal(item, selectedBookingOption, guestPrices) + recoveryAddOnsTotal(item)),
  };
}
