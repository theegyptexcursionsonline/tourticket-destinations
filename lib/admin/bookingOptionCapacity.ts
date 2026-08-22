import { defaultMinCapacity, minCapacityRequired } from '@/lib/bookings/unitPricing';

type CapacityOptionInput = Record<string, unknown> & {
  label?: string;
  type?: string;
  minCapacity?: unknown;
  maxCapacity?: unknown;
};

/**
 * Normalise the capacity fields on every booking option before save: blank
 * means "not set"; Per Couple / Per Family inherit their type default when the
 * admin leaves the minimum blank. Mutates and returns the same array.
 */
export function applyBookingOptionCapacityDefaults<T extends CapacityOptionInput>(options: T[]): T[] {
  for (const option of options) {
    for (const field of ['minCapacity', 'maxCapacity'] as const) {
      const raw = option[field];
      if (raw === undefined || raw === null || raw === '') {
        delete option[field];
      } else {
        option[field] = Number(raw);
      }
    }
    if (option.minCapacity === undefined) {
      const fallback = defaultMinCapacity(option.type);
      if (fallback !== null && fallback > 1) option.minCapacity = fallback;
    }
  }
  return options;
}

/**
 * Field-level capacity validation shared by every booking-option write path.
 * Returns an admin-facing message naming the option, or null when valid.
 */
export function bookingOptionCapacityError(options: CapacityOptionInput[]): string | null {
  for (const [index, option] of options.entries()) {
    const name = (typeof option.label === 'string' && option.label.trim()) || `Booking option ${index + 1}`;
    const min = option.minCapacity as number | undefined;
    const max = option.maxCapacity as number | undefined;
    if (min !== undefined && (!Number.isInteger(min) || min < 1 || min > 100)) {
      return `${name}: minimum capacity must be a whole number between 1 and 100`;
    }
    if (max !== undefined && (!Number.isInteger(max) || max < 1 || max > 1000)) {
      return `${name}: maximum capacity must be a whole number between 1 and 1000`;
    }
    if (min !== undefined && max !== undefined && max < min) {
      return `${name}: maximum capacity cannot be below the minimum capacity`;
    }
    if (min === undefined && minCapacityRequired(option.type)) {
      // Couple/Family were defaulted, so only Per Group can land here.
      return `${name}: a ${String(option.type)} option needs a minimum capacity before it can be saved`;
    }
  }
  return null;
}
