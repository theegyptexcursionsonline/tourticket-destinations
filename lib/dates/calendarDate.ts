export type CalendarDateStyle = 'short' | 'numeric';

const STYLES: Record<CalendarDateStyle, Intl.DateTimeFormatOptions> = {
  short: { year: 'numeric', month: 'short', day: 'numeric' },
  numeric: { year: 'numeric', month: 'numeric', day: 'numeric' },
};

/**
 * A stored calendar date (publish date and similar) as text in the page
 * language.
 *
 * Always formatted in UTC and in the page language, never in the visitor's
 * time zone or browser language: the server renders in UTC, so a visitor east
 * of UTC (Cairo) saw the next day for a post published late in the evening,
 * and the page failed to hydrate (React error 418 on blog articles).
 */
export function formatCalendarDate(
  value: string | number | Date | null | undefined,
  locale: string | undefined,
  style: CalendarDateStyle = 'short',
): string {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const options = { ...STYLES[style], timeZone: 'UTC' };
  try {
    return date.toLocaleDateString(locale || 'en-US', options);
  } catch {
    return date.toLocaleDateString('en-US', options);
  }
}
