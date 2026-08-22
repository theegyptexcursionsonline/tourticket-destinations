// Matching the search page's duration buckets against how editors actually
// write a tour's duration.
//
// `duration` is free text — "4 hours", "2 - 5 hours", "2.5 hours", "2 days",
// "15-20 minutes flight", "Variable" — so the search route's numeric
// `$gte`/`$lte` could never match a single document. Worse, it built
// `{ duration: { $or: [...] } }`, which is not valid at field level: every
// duration filter returned HTTP 500, and the search page rendered that failure
// as "No tours found".
//
// Durations are parsed here instead, against the real vocabulary, and the
// route turns the result into an `$in` over the values that qualify.

export interface DurationSpan {
  /** Shortest the tour can run, in hours. */
  minHours: number;
  /** Longest it can run. Equal to minHours for a single figure. */
  maxHours: number;
}

const UNIT_HOURS: Array<{ pattern: RegExp; hours: number }> = [
  { pattern: /\b(?:day|days|tag|tage|día|días|jour|jours|день|дня|дней|يوم|أيام)\b/iu, hours: 24 },
  { pattern: /\b(?:night|nights|nacht|nächte)\b/iu, hours: 24 },
  { pattern: /\b(?:minute|minutes|min|mins|minuten|minuto|minutos|минут|دقيقة|دقائق)\b/iu, hours: 1 / 60 },
  { pattern: /\b(?:hour|hours|hr|hrs|stunde|stunden|hora|horas|heure|heures|час|часа|часов|ساعة|ساعات)\b/iu, hours: 1 },
];

function unitHours(text: string): number {
  for (const { pattern, hours } of UNIT_HOURS) {
    if (pattern.test(text)) return hours;
  }
  // No recognisable unit — hours is the overwhelming convention in the
  // catalogue, but see parseDurationSpan: a value with no number at all is
  // rejected outright rather than assumed.
  return 1;
}

/**
 * Reads a duration string as a span in hours, or null when it carries no
 * figure at all ("Variable", "Flexible"). A tour whose duration cannot be read
 * is never claimed to match a bucket — it is excluded rather than guessed.
 */
export function parseDurationSpan(duration?: string | null): DurationSpan | null {
  const text = String(duration || '').trim();
  if (!text) return null;

  const numbers = text.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers || numbers.length === 0) return null;

  const perUnit = unitHours(text);
  const values = numbers
    .map((value) => Number(value.replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .map((value) => value * perUnit);
  if (values.length === 0) return null;

  return { minHours: Math.min(...values), maxHours: Math.max(...values) };
}

/**
 * Whether a duration overlaps a bucket. "2 - 5 hours" belongs in both the
 * 2-4 and 4-6 buckets, because a customer filtering for either could take it.
 */
export function durationMatchesBucket(
  duration: string | null | undefined,
  minHours: number,
  maxHours: number,
): boolean {
  const span = parseDurationSpan(duration);
  if (!span) return false;
  return span.minHours <= maxHours && span.maxHours >= minHours;
}

/**
 * Parses the `0-2,4-6` bucket syntax the search page sends.
 *
 * The final bucket arrives as `6-24` but is labelled "more than 6 hours", so
 * its upper end is open: a two-day tour belongs there, not nowhere. Any bucket
 * reaching a full day is treated as unbounded above.
 */
export function parseDurationBuckets(raw?: string | null): Array<[number, number]> {
  return String(raw || '')
    .split(',')
    .map((bucket) => bucket.split('-').map((value) => Number(value.trim())))
    .filter((pair): pair is [number, number] =>
      pair.length === 2 && pair.every((value) => Number.isFinite(value)))
    .map(([first, second]) => {
      const min = Math.min(first, second);
      const max = Math.max(first, second);
      return [min, max >= 24 ? Number.POSITIVE_INFINITY : max] as [number, number];
    });
}

/**
 * Narrows the catalogue's distinct duration strings to those a set of buckets
 * covers, so the query can match on values that exist rather than on arithmetic
 * the field cannot support.
 */
export function durationValuesMatchingBuckets(
  values: Array<string | null | undefined>,
  buckets: Array<[number, number]>,
): string[] {
  if (buckets.length === 0) return [];
  const matched = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string' || value.trim() === '') continue;
    if (buckets.some(([min, max]) => durationMatchesBucket(value, min, max))) {
      matched.add(value);
    }
  }
  return [...matched];
}
