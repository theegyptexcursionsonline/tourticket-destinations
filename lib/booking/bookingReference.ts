/**
 * Booking references look like `HEO-12345678-AB12CD` (brand prefix, time part,
 * random part). Customers copy them from the confirmation e-mail, which prints
 * them as "Booking HEO-…", so accept whatever they paste and pull the
 * reference out of it.
 */
const REFERENCE_CANDIDATE = /[A-Z0-9]+(?:-[A-Z0-9]+){1,3}/g;
const MIN_LENGTH = 6;
const MAX_LENGTH = 40;

export function extractBookingReference(input: string): string | null {
  const text = input.normalize('NFKC').toUpperCase();
  const candidates = (text.match(REFERENCE_CANDIDATE) ?? []).filter(
    (candidate) => candidate.length >= MIN_LENGTH && candidate.length <= MAX_LENGTH,
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((longest, candidate) => (candidate.length > longest.length ? candidate : longest));
}
