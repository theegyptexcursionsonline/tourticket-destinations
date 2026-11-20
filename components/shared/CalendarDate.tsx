'use client';

import { useLocale } from 'next-intl';
import { formatCalendarDate, type CalendarDateStyle } from '@/lib/dates/calendarDate';

/** A stored date that renders the same text on the server and in the browser. */
export default function CalendarDate({
  value,
  dateStyle = 'short',
}: {
  value: string | number | Date | null | undefined;
  dateStyle?: CalendarDateStyle;
}) {
  const locale = useLocale();
  return <>{formatCalendarDate(value, locale, dateStyle)}</>;
}
