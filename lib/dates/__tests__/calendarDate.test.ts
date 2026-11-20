import { formatCalendarDate } from '@/lib/dates/calendarDate';

// A post published late in the evening (UTC) showed the next day to visitors
// east of UTC, so the server and browser text differed and the blog article
// failed to hydrate (React error 418). The date is now always read in UTC.
describe('calendar dates', () => {
  const lateEvening = '2026-06-29T22:30:00.000Z';

  it('reads the stored date in UTC, whatever the visitor time zone', () => {
    expect(formatCalendarDate(lateEvening, 'en-US')).toBe('Jun 29, 2026');
    expect(formatCalendarDate(new Date(lateEvening), 'en-US', 'numeric')).toBe('6/29/2026');
  });

  it('uses the page language', () => {
    expect(formatCalendarDate(lateEvening, 'de')).toBe('29. Juni 2026');
    expect(formatCalendarDate(lateEvening, 'de', 'numeric')).toBe('29.6.2026');
  });

  it('gives the same text as the previous English server rendering', () => {
    const serverBefore = new Date(lateEvening).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    expect(formatCalendarDate(lateEvening, 'en-US')).toBe(serverBefore);
  });

  it('is empty for a missing or invalid date and falls back for an unknown language', () => {
    expect(formatCalendarDate(undefined, 'en')).toBe('');
    expect(formatCalendarDate(null, 'en')).toBe('');
    expect(formatCalendarDate('', 'en')).toBe('');
    expect(formatCalendarDate('not a date', 'en')).toBe('');
    expect(formatCalendarDate(lateEvening, 'not_a_locale!!')).toBe('Jun 29, 2026');
    expect(formatCalendarDate(lateEvening, undefined)).toBe('Jun 29, 2026');
  });
});
