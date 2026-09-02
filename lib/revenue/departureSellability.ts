import { RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';

const STANDARD_OPTION_KEY = 'standard';

export type DepartureSlot = {
  time: string;
  capacity: number;
  booked?: number;
  extraCapacity?: number;
  blocked?: boolean;
};

export type SellableBookingOption = {
  _id?: unknown;
  id?: string;
  pricingKey?: string;
};

export type DepartureSellabilityFacts = {
  scheduled: boolean;
  startsAtUtc: string;
  now?: Date;
  slots: DepartureSlot[];
  time: string;
  explicitStopSale: boolean;
  fullStopSale: boolean;
  optionStopSale: boolean;
  booked: number;
};

function optionId(option: SellableBookingOption, index: number) {
  return String(option.id || option._id || `option-${index}`);
}

/**
 * Stop-sale records predate immutable pricing keys, so accept both the current
 * storefront option ID and the pricing key while existing rows are migrated.
 */
export function stopSaleAliasesForOption(
  bookingOptions: SellableBookingOption[] | undefined,
  requestedKey: string,
) {
  if (requestedKey === STANDARD_OPTION_KEY || requestedKey === 'standard-default') {
    return ['standard', 'standard-default'];
  }
  const index = (bookingOptions || []).findIndex((option, optionIndex) => (
    option.pricingKey === requestedKey || optionId(option, optionIndex) === requestedKey
  ));
  if (index < 0) return [];
  const option = bookingOptions![index];
  return Array.from(new Set([option.pricingKey || requestedKey, optionId(option, index)].filter(Boolean)));
}

export function stoppedPricingKeysForOptionIds(
  bookingOptions: SellableBookingOption[] | undefined,
  stoppedOptionIds: Iterable<string>,
) {
  const stopped = new Set(stoppedOptionIds);
  const keys: string[] = [];
  if (['standard', 'standard-default'].some((alias) => stopped.has(alias))) keys.push(STANDARD_OPTION_KEY);
  for (const option of bookingOptions || []) {
    if (!option.pricingKey) continue;
    if (stopSaleAliasesForOption(bookingOptions, option.pricingKey).some((alias) => stopped.has(alias))) keys.push(option.pricingKey);
  }
  return Array.from(new Set(keys));
}

export function evaluateDepartureSellability(facts: DepartureSellabilityFacts) {
  if (!facts.scheduled) {
    throw new RevenuePricingWriteError(422, 'DEPARTURE_NOT_SCHEDULED', 'The target date is not a scheduled departure.');
  }
  const startsAt = new Date(facts.startsAtUtc);
  if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= (facts.now || new Date()).getTime()) {
    throw new RevenuePricingWriteError(422, 'DEPARTURE_NOT_FUTURE', 'Price changes are allowed only for future departures.');
  }
  if (facts.explicitStopSale || facts.fullStopSale) {
    throw new RevenuePricingWriteError(422, 'DEPARTURE_STOP_SALE', 'The target departure is stop-saled.');
  }
  if (facts.optionStopSale) {
    throw new RevenuePricingWriteError(422, 'OPTION_STOP_SALE', 'The target booking option is stop-saled.');
  }
  const slot = facts.slots.find((candidate) => candidate.time === facts.time);
  if (!slot) {
    throw new RevenuePricingWriteError(422, 'DEPARTURE_TIME_UNAVAILABLE', 'The target departure time is not available.');
  }
  if (slot.blocked) {
    throw new RevenuePricingWriteError(422, 'DEPARTURE_SLOT_BLOCKED', 'The target departure time is blocked.');
  }
  const capacity = Number(slot.capacity || 0) + Number(slot.extraCapacity || 0);
  const booked = Math.max(Number(slot.booked || 0), Number(facts.booked || 0));
  if (!Number.isFinite(capacity) || capacity <= 0 || booked >= capacity) {
    throw new RevenuePricingWriteError(422, 'DEPARTURE_SOLD_OUT', 'The target departure has no sellable capacity.');
  }
  return { startsAtUtc: facts.startsAtUtc, capacity, booked, available: capacity - booked };
}

