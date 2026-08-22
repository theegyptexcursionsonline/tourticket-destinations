import { effectiveUnitSize, isUnitPricedType, unitCount, type UnitCapacityOption } from '@/lib/bookings/unitPricing';

/**
 * The tour subtotal for one cart line, before add-ons and fees.
 *
 * Per Person options charge each adult the base price and each child half of
 * it (this network's long-standing child rule). Per Couple / Per Family /
 * Per Group options price a WHOLE unit and are charged in units rounded up
 * — never multiplied per guest, which is the overcharge the client reported.
 *
 * One rule, used by the Stripe amount, the recorded booking, the cart and
 * the booking sidebar, so the four can never disagree.
 */
export function optionSubtotal(
  option: UnitCapacityOption | null | undefined,
  basePrice: number,
  adults: number,
  children: number,
): number {
  const adultCount = Math.max(0, Math.floor(Number(adults) || 0));
  const childCount = Math.max(0, Math.floor(Number(children) || 0));
  if (option && isUnitPricedType(option.type)) {
    const units = unitCount(adultCount + childCount, effectiveUnitSize(option));
    return units * basePrice;
  }
  return basePrice * adultCount + (basePrice / 2) * childCount;
}
