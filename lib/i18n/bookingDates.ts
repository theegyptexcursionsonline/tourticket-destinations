/**
 * Dates in the booking path, written in the page language. The calendar month
 * and weekday names were fixed English words on every page, and some sister
 * sites printed the chosen date with a fixed "en-US" ("Friday, November 20,
 * 2026" on the German page). Digits stay Latin on every page, as the prices do.
 */
export function bookingDateLocale(locale: string | null | undefined): string {
  return `${(locale || 'en').split('-')[0]}-u-nu-latn`;
}

/** "November 2026", "نوفمبر 2026", "noviembre de 2026": the calendar heading. */
export function calendarMonthTitle(month: Date, locale: string | null | undefined): string {
  return new Intl.DateTimeFormat(bookingDateLocale(locale), { month: 'long', year: 'numeric' })
    .format(new Date(month.getFullYear(), month.getMonth(), 15, 12));
}

/** Weekday column labels, Sunday first. English keeps its two-letter labels. */
export function calendarWeekdayNames(locale: string | null | undefined): string[] {
  const language = (locale || 'en').split('-')[0];
  if (language === 'en') return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const format = new Intl.DateTimeFormat(bookingDateLocale(language), { weekday: 'short' });
  // 1 Nov 2026 is a Sunday, so the names come out in column order.
  // Abbreviation dots dropped ("So." reads "So", as the German calendar always did).
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 10, 1 + index, 12)).replace(/\.$/, ''));
}

/** "Friday, November 20, 2026" in the page language. */
export function formatBookingDate(
  date: Date,
  locale: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
): string {
  return date.toLocaleDateString(bookingDateLocale(locale), options);
}
