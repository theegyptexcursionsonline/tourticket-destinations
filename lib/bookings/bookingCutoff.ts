/** Duration in elapsed minutes before the authored local departure. */
export const MAX_BOOKING_CUTOFF_MINUTES = 43_200;
export function isValidBookingCutoff(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_BOOKING_CUTOFF_MINUTES;
}
export function bookingCutoffPayloadError(body: Record<string, unknown>): string | null {
  if (!Object.prototype.hasOwnProperty.call(body, 'bookingCutoffMinutes')) return null;
  return isValidBookingCutoff(body.bookingCutoffMinutes) ? null : 'Booking cutoff must be a whole number from 0 to 43200 minutes (30 days).';
}
export function resolveBookingCutoff(value: unknown): number {
  if (value === undefined) return 0;
  if (!isValidBookingCutoff(value)) throw new Error('Booking cutoff configuration is unavailable.');
  return value;
}

/** A stale editor changing other fields must not restore an old cutoff. */
export function cutoffAwareTourPayload<T extends Record<string, unknown>>(payload: T, current: Record<string, unknown>, loaded: Record<string, unknown> | null): Record<string, unknown> {
  if (!loaded) return payload;
  const cutoffChanged = current.bookingCutoffMinutes !== loaded.bookingCutoffMinutes;
  const withoutCutoff = (form: Record<string, unknown>) => JSON.stringify({ ...form, bookingCutoffMinutes: 0 });
  if (cutoffChanged && withoutCutoff(current) === withoutCutoff(loaded)) return { bookingCutoffMinutes: current.bookingCutoffMinutes };
  if (!cutoffChanged) {
    const result: Record<string, unknown> = { ...payload };
    delete result.bookingCutoffMinutes;
    return result;
  }
  return payload;
}

export function cutoffScheduleError(tour: { bookingCutoffMinutes?: unknown; availability?: { slots?: Array<{ time?: unknown }> }; bookingOptions?: Array<{ timeSlots?: Array<{ time?: unknown }> }> }): string | null {
  if (!isValidBookingCutoff(tour.bookingCutoffMinutes) || tour.bookingCutoffMinutes === 0) return null;
  const universal = tour.availability?.slots;
  const options = tour.bookingOptions;
  if ((universal !== undefined && !Array.isArray(universal)) || (options !== undefined && !Array.isArray(options))) return 'Add a valid departure schedule before setting a booking cutoff.';
  const slots = [...(universal || []), ...(options || []).flatMap(option => Array.isArray(option?.timeSlots) ? option.timeSlots : [])];
  return tour.availability && slots.some(slot => typeof slot?.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.time))
    ? null : 'Add a departure schedule before setting a booking cutoff.';
}
