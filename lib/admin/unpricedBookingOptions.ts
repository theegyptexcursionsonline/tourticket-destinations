import { isRealPrice } from '@/lib/pricing/effectivePrice';

/**
 * Booking options that have no real price anywhere: a 0 or blank base price
 * and no start time with a price of its own.
 *
 * The storefront lists such an option as "Price on request" and does not let
 * it be booked online. Some are kept that way on purpose, so saving one is
 * allowed; staff only get told which options will not be bookable. Nothing
 * here changes a stored price.
 *
 * Mirrors the storefront rule: a start time with its own number uses it (an
 * explicit 0 is not a price), a start time without one inherits the base.
 */
export interface UnpricedOptionInput {
  label?: unknown;
  title?: unknown;
  price?: unknown;
  timeSlots?: Array<{ price?: unknown } | null | undefined> | null;
}

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function optionHasRealPrice(option: UnpricedOptionInput | null | undefined): boolean {
  if (!option) return false;
  const base = asNumber(option.price);
  const slots = Array.isArray(option.timeSlots) ? option.timeSlots : [];
  if (slots.length === 0) return isRealPrice(base);
  return slots.some((slot) => {
    const own = asNumber(slot?.price);
    return isRealPrice(own ?? base);
  });
}

function optionName(option: UnpricedOptionInput, index: number): string {
  for (const candidate of [option.label, option.title]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return `Option ${index + 1}`;
}

/** Names of the options a customer could not book online, in form order. */
export function unpricedBookingOptionNames(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.flatMap((option, index) => {
    if (!option || typeof option !== 'object') return [];
    const input = option as UnpricedOptionInput;
    return optionHasRealPrice(input) ? [] : [optionName(input, index)];
  });
}

/** The warning a save response carries; always present so callers need no guard. */
export function unpricedOptionsWarning(options: unknown): { unpricedOptions: string[] } {
  return { unpricedOptions: unpricedBookingOptionNames(options) };
}

export function unpricedOptionsMessage(names: string[]): string {
  if (names.length === 0) return '';
  const list = names.map((name) => `"${name}"`).join(', ');
  return names.length === 1
    ? `Saved. ${list} has no price, so customers see "Price on request" and cannot book it online.`
    : `Saved. ${list} have no price, so customers see "Price on request" and cannot book them online.`;
}
