import fs from 'node:fs';
import path from 'node:path';
import { calendarMonthTitle, calendarWeekdayNames, formatBookingDate } from '@/lib/i18n/bookingDates';
import { formatDuration, formatLanguageList } from '@/lib/i18n/displayValues';

// 19 Nov 2026: the booking drawer printed the chosen date with a fixed locale
// ("Friday, November 20, 2026" on German and Russian pages), the calendar
// names in one language on every page, and option durations and guide
// languages exactly as typed in English ("6 hours", "English") on the Russian page.
const day = new Date(2026, 10, 20, 12);
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('booking dates follow the page language', () => {
  it.each([
    ['en', 'Friday, November 20, 2026'],
    ['de', 'Freitag, 20. November 2026'],
    ['fr', 'vendredi 20 novembre 2026'],
    ['es', 'viernes, 20 de noviembre de 2026'],
    ['ru', 'пятница, 20 ноября 2026 г.'],
  ])('%s', (locale, full) => {
    expect(formatBookingDate(day, locale)).toBe(full);
  });

  it('Arabic month and day names, Latin digits', () => {
    expect(formatBookingDate(day, 'ar')).toMatch(/الجمعة/);
    expect(formatBookingDate(day, 'ar')).not.toMatch(/[٠-٩]/);
    expect(calendarMonthTitle(day, 'ar')).toMatch(/نوفمبر 2026/);
  });

  it('German calendar labels read as before; other languages get their own', () => {
    expect(calendarMonthTitle(day, 'de')).toBe('November 2026');
    expect(calendarWeekdayNames('de')).toEqual(['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']);
    expect(calendarWeekdayNames('en')).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
    expect(calendarWeekdayNames('ru')[0]).toBe('вс');
    expect(calendarMonthTitle(day, 'ru')).toMatch(/^ноябрь 2026/);
  });

  it('the booking drawer and checkout no longer fix the date language', () => {
    for (const file of ['components/BookingSidebar.tsx', 'app/[locale]/checkout/CheckoutClientPage.tsx']) {
      const source = read(file);
      expect(source).not.toMatch(/toLocaleDateString\('(en-US|de-DE)'/);
    }
    const drawer = read('components/BookingSidebar.tsx');
    expect(drawer).toContain('{calendarMonthTitle(currentMonth, locale)}');
    expect(drawer).toContain('calendarWeekdayNames(locale)');
  });
});

describe('typed durations and guide languages in the page language', () => {
  it.each([
    ['6 hours', 'ru', '6 часов'],
    ['1 hour', 'ru', '1 час'],
    ['3 hours', 'ru', '3 часа'],
    ['16 Stunden', 'ru', '16 часов'],
    ['16 Stunden', 'de', '16 Stunden'],
    ['6 hours', 'de', '6 Stunden'],
    ['6 hours', 'en', '6 hours'],
    ['2 days', 'fr', '2 jours'],
  ])('%s on a %s page reads %s', (raw, locale, expected) => {
    expect(formatDuration(raw, locale)).toBe(expected);
  });

  it('operator text that is not a plain duration is shown as written', () => {
    expect(formatDuration('2 - 5 hours', 'ru')).toBe('2 - 5 hours');
    expect(formatDuration('Ganztägig', 'ru')).toBe('Ganztägig');
    expect(formatDuration('', 'ru')).toBe('');
  });

  it('guide languages are named in the page language', () => {
    expect(formatLanguageList(['English', 'Arabic'], 'ru')).toBe('английский, арабский');
    expect(formatLanguageList(['English'], 'de')).toBe('Englisch');
  });

  it('the option card no longer invents "Easy" or "3 hours"', () => {
    const drawer = read('components/BookingSidebar.tsx');
    expect(drawer).not.toContain("difficulty: option.difficulty || 'Easy'");
    expect(drawer).not.toContain("|| '3 hours'");
    expect(drawer).toContain('formatDuration(option.duration, locale)');
    expect(drawer).toContain('tourDifficultyLabel(option.difficulty, t)');
  });
});

describe('search card and wishlist show the trip page price', () => {
  it.each(['components/user/TourCard.tsx', 'components/WishlistSidebar.tsx'])('%s', (file) => {
    const source = read(file);
    expect(source).not.toContain('value={tour.discountPrice}');
    expect(source).not.toMatch(/>From</);
  });
});

// 19 Nov 2026 walk: the search results page read "Find Your Next Adventure",
// "Show Filters" and "Showing 17 result(s)" on the German and Russian pages.
describe('the search results page follows the page language', () => {
  const page = read('app/[locale]/search/SearchClient.tsx');
  it('has no fixed English words left', () => {
    for (const text of ['Find Your Next Adventure', "'Show'} Filters", 'Sort by:', '>Price Range<', '>No tours found<', 'Clear all', 'Up to 2 hours']) {
      expect(page).not.toContain(text);
    }
    expect(page).toContain("useTranslations('searchPage')");
  });

  it.each(['en', 'de', 'ar', 'fr', 'es', 'ru'])('%s has every search page word', (locale) => {
    const messages = JSON.parse(read(`messages/${locale}.json`)).searchPage;
    for (const key of ['title', 'searchPlaceholder', 'showFilters', 'hideFilters', 'searching', 'showingResults', 'sortBy', 'filters', 'clearAll', 'categories', 'destinations', 'priceRange', 'rating', 'noToursFoundTitle', 'clearFilters']) {
      expect(typeof messages[key]).toBe('string');
    }
    expect(messages.showingResults).toMatch(/\{count[,}]/);
    expect(Object.keys(messages.sortOptions)).toHaveLength(4);
    expect(Object.keys(messages.duration)).toHaveLength(5);
  });
});
