import { isUnitPricedType, type UnitCapacityOption } from '@/lib/bookings/unitPricing';
import { guestPricedSubtotal, resolveCatalogueGuestPrices, type GuestPriceSet } from '@/lib/revenue/guestPrices';

/**
 * Price one booking line from the STORED tour — the post-payment booking
 * writer (Stripe webhook) and the manual booking routes use this so the
 * recorded booking is built by the same rule as the Stripe amount
 * (lib/security/checkoutPricing.ts): adult through authoritativeBasePrice,
 * child/infant from the selected departure's guest prices, whole-unit
 * options charged per unit.
 *
 * The caller has already matched the option it means (the webhook by the
 * option id in the payment metadata, the manual routes by option type). The
 * option is pinned into the resolver so a duplicate type or a legacy option
 * without an id can never be priced as a different option.
 */

export interface StoredLineInput {
  tour: Record<string, unknown> | null | undefined;
  option?: (UnitCapacityOption & Record<string, unknown>) | null;
  selectedTime?: string | null;
  adults: number;
  children: number;
  infants: number;
}

export interface StoredLinePricing {
  guestPrices: GuestPriceSet;
  tourSubtotal: number;
  unitPriced: boolean;
}

const PINNED_OPTION_ID = '__selected_option__';

/** Mongoose documents keep their paths on the prototype; spread the plain object instead. */
const plain = <T,>(value: T): T => {
  const candidate = value as { toObject?: () => T } | null | undefined;
  return candidate && typeof candidate.toObject === 'function' ? candidate.toObject() : value;
};

export function priceStoredLine(input: StoredLineInput): StoredLinePricing {
  const tour = plain(input.tour) as Record<string, unknown> | null | undefined;
  const option = input.option ? (plain(input.option) as UnitCapacityOption & Record<string, unknown>) : null;
  const catalogue = option
    ? { ...(tour ?? {}), bookingOptions: [{ ...option, id: PINNED_OPTION_ID, pricingKey: undefined }] }
    : tour;
  const guestPrices = resolveCatalogueGuestPrices(
    catalogue as Parameters<typeof resolveCatalogueGuestPrices>[0],
    {
      selectedBookingOption: option ? { id: PINNED_OPTION_ID } : null,
      selectedTime: input.selectedTime ?? null,
    },
  );
  for (const guest of ['adult', 'child', 'infant'] as const) {
    if (!Number.isFinite(guestPrices[guest]) || guestPrices[guest] < 0) throw new Error('Invalid tour price');
  }
  return {
    guestPrices,
    tourSubtotal: guestPricedSubtotal(option, guestPrices, input.adults, input.children, input.infants),
    unitPriced: isUnitPricedType(option?.type),
  };
}

/**
 * Split the amount actually charged across the order's lines in proportion
 * to their subtotals, in whole cents, so the recorded bookings sum to the
 * charge exactly. A single line simply records the charge.
 */
export function allocateChargedTotal(lineSubtotals: number[], chargedTotal: number): number[] {
  const chargedMinor = Math.round(Number(chargedTotal) * 100);
  if (lineSubtotals.length === 0) return [];
  if (lineSubtotals.length === 1) return [chargedMinor / 100];
  const weights = lineSubtotals.map((value) => Math.max(0, Number(value) || 0));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const shares = weights.map((weight) => (weightSum > 0
    ? Math.floor((chargedMinor * weight) / weightSum)
    : Math.floor(chargedMinor / weights.length)));
  let remainder = chargedMinor - shares.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % shares.length) {
    shares[index] += 1;
    remainder -= 1;
  }
  return shares.map((minor) => minor / 100);
}
