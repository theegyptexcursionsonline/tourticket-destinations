import fs from 'fs';
import path from 'path';

// 19 Nov 2026: the booking drawer step names were fixed words in one language
// on every locale (English on the Russian page). They are message keys now.
const keys = [
  'stepDateGuests', 'stepTourOptions', 'stepEnhance', 'stepReviewBook',
  'stepShortDate', 'stepShortOptions', 'stepShortEnhance', 'stepShortReview',
];
const locales = fs.readdirSync(path.join(process.cwd(), 'messages')).filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', ''));
const read = (locale: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));

describe('booking drawer step names follow the page language', () => {
  it('the site offers the six languages', () => {
    expect(locales.sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'ru']);
  });

  it.each(locales)('%s has every step name', (locale) => {
    const booking = read(locale).booking;
    for (const key of keys) {
      expect(typeof booking[key]).toBe('string');
      expect(booking[key].trim().length).toBeGreaterThan(0);
    }
  });

  it.each(locales.filter((locale) => locale !== 'en'))('%s is not left in English', (locale) => {
    const english = read('en').booking;
    const own = read(locale).booking;
    for (const key of ['stepDateGuests', 'stepEnhance', 'stepReviewBook']) expect(own[key]).not.toBe(english[key]);
  });

  it('the drawer renders the keys through the translator', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components', 'BookingSidebar.tsx'), 'utf8');
    const steps = source.slice(source.indexOf('const STEPS = ['), source.indexOf('const StepsIndicator'));
    for (const key of ['stepDateGuests', 'stepTourOptions', 'stepEnhance', 'stepReviewBook']) expect(steps).toContain(`'booking.${key}'`);
    expect(source).toContain('{t(step.shortTitle)}');
    expect(source).toContain('{t(step.title)}');
  });
});
