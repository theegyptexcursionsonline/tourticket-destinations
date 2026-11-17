/**
 * Destination and category pages on this network site (17 Nov parity with the
 * main site): the Top 10 list must not split into two columns at 768 px, the
 * first trips follow the hero on phones, the hero is sized by its content below
 * lg, labels come from the language tables, and no fixed rating, review or
 * traveller figure is printed. (Trip ratings here come with review records,
 * so the cards keep them.)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContentBreadcrumbs } from '@/lib/content/breadcrumbs';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const destination = read('app/[locale]/destinations/[slug]/DestinationPageClient.tsx');
const category = read('app/[locale]/categories/[slug]/CategoryPageClient.tsx');
const ARABIC = /[؀-ۿ]/;
const constClasses = (source: string, name: string) => {
  const match = source.match(new RegExp(`const ${name} = '([^']+)'`));
  expect(match).not.toBeNull();
  return match![1].split(/\s+/);
};
const FULL_HEIGHT = /(?:^|[\s'"`])(?:min-h-\[\d+(?:px|vh)\]|h-screen|h-\[\d+vh\]|max-h-\[\d+px\])/;

describe('destination page layout', () => {
  it('Top 10 has one column below lg, so nothing at or below 768 px splits it', () => {
    const grid = constClasses(destination, 'TOP_TOURS_GRID');
    expect(grid).toEqual(expect.arrayContaining(['grid-cols-1', 'lg:grid-cols-2']));
    expect(grid.filter((c) => /^(sm|md):grid-cols-/.test(c))).toEqual([]);
    expect(destination).toContain('<div data-top-tours-grid className={TOP_TOURS_GRID}>');
    expect(destination).not.toContain('grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 max-w-6xl mx-auto');
  });

  it('Top 10 cards can shrink and their cart button stays whole', () => {
    const card = destination.slice(destination.indexOf('const Top10Card'), destination.indexOf('const CombiDealCard'));
    expect(card).toContain('className="min-w-0 flex flex-col sm:flex-row');
    expect(card).toContain('<div className="flex-1 w-full min-w-0">');
    expect(card).toContain('[overflow-wrap:anywhere]');
    expect(card).toContain('flex sm:flex-col flex-shrink-0 items-center gap-2 ms-auto sm:ms-0');
  });

  it('hero is content-sized below lg and the first trip list follows it on phones', () => {
    const tag = destination.slice(destination.indexOf('<section data-destination-hero'), destination.indexOf('>', destination.indexOf('<section data-destination-hero')) + 1);
    expect(tag).toContain('lg:h-screen lg:max-h-[900px]');
    expect(tag.replace(/lg:[^\s"]+/g, '')).not.toMatch(FULL_HEIGHT);
    expect(destination).toContain('pt-24 pb-8 sm:pt-28 sm:pb-10 lg:py-0');
    expect(constClasses(destination, 'PHONE_FIRST')).toEqual(['order-first', 'lg:order-none']);
    expect(destination).toContain('className="flex min-h-screen flex-col lg:block bg-white"');
    expect(destination).toContain('<div className={PHONE_FIRST}>');
    expect(destination).toContain('data-destination-best-deals className={`py-12 sm:py-20 bg-white overflow-hidden ${PHONE_FIRST}`}');
    expect(destination).toContain("featuredTours.length === 0 ? PHONE_FIRST : ''");
  });
});

describe('category page layout', () => {
  it('hero heights apply from lg only and the first trips follow the hero on phones', () => {
    const map = category.slice(category.indexOf('const CATEGORY_HERO_HEIGHT'), category.indexOf('};', category.indexOf('const CATEGORY_HERO_HEIGHT')));
    for (const template of ['immersive', 'editorial', 'classic']) {
      const line = map.split('\n').find((row) => row.trim().startsWith(`${template}:`))!;
      for (const cls of line.slice(line.indexOf("'") + 1, line.lastIndexOf("'")).split(/\s+/)) expect(cls.startsWith('lg:')).toBe(true);
    }
    expect(category).toContain('<section data-category-hero className={`relative w-full ${CATEGORY_HERO_HEIGHT[pageTemplate]}`}>');
    expect(category).toContain("'lg:self-end lg:pb-20'");
    expect(category).not.toContain("'self-end pb-10 md:pb-20'");
    expect(constClasses(category, 'PHONE_TRIPS_FIRST')).toEqual(['order-first', 'lg:order-none']);
    expect(category).toContain('className={PHONE_TRIPS_FIRST} />');
    expect(category).toContain("topPicks.length === 0 ? PHONE_TRIPS_FIRST : ''");
  });
});

describe('labels come from the language tables', () => {
  it('destination gallery, practical card titles and breadcrumb are not hard-coded', () => {
    for (const key of ['galleryTitle', 'practicalTitle', 'practicalClimate', 'practicalVisa', 'practicalLanguages', 'practicalEmergency', 'practicalSummer', 'practicalWinter', 'home', 'destinationsRoot']) {
      const rows = destination.split('\n').filter((row) => row.trim().startsWith(`${key}:`));
      expect(rows.length).toBeGreaterThanOrEqual(3); // type + two language tables
      expect(rows.some((row) => ARABIC.test(row))).toBe(true);
    }
    expect(destination).toContain('{copy.galleryTitle}</h2>');
    expect(destination).toContain('{copy.practicalTitle}</h2>');
    expect(destination).toContain('homeLabel: copy.home,');
  });

  it('the first breadcrumb is in the visitor language when a page passes one', () => {
    expect(buildContentBreadcrumbs({ currentTitle: 'Luxor', homeLabel: 'الرئيسية' })[0]).toEqual({ label: 'الرئيسية', href: '/' });
    expect(buildContentBreadcrumbs({ currentTitle: 'Luxor' })[0]).toEqual({ label: 'Home', href: '/' });
  });
});

describe('figures the data cannot back are gone', () => {
  it('no fixed rating or traveller count in the destination hero', () => {
    expect(destination).not.toMatch(/ratingStat|travelersStat|4[.,]8\/5|50[.,]?000\+|50K\+|50 ألف/);
  });

  it('the reviews header summarises the reviews it shows', () => {
    expect(destination).toMatch(/reviewsSummary: \(average: number, count: number\) => string;/);
    expect(destination).toContain('{copy.reviewsSummary(averageRating, reviews.length)}');
    expect(destination).toMatch(/const averageRating = reviews\.reduce/);
  });

  it('the stats strip shows only the real trip count', () => {
    const strip = destination.slice(destination.indexOf('const StatsSection'), destination.indexOf('// --- Travel Tips'));
    expect(strip).toContain('String(destinationTours.length)');
    expect(strip).not.toMatch(/statsHappyTravelers|statsAverageRating|statsCustomerSupport|24\/7/);
  });
});

describe('long names wrap instead of widening the page', () => {
  it('category and destination titles may break inside a long word', () => {
    const categoryH1 = category.slice(category.indexOf('<h1'), category.indexOf('>', category.indexOf('<h1')));
    const destinationH1 = destination.slice(destination.indexOf('<h1'), destination.indexOf('>', destination.indexOf('<h1')));
    expect(categoryH1).toContain('[overflow-wrap:anywhere]');
    expect(destinationH1).toContain('[overflow-wrap:anywhere]');
  });
});
