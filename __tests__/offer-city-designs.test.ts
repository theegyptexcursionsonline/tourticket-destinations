import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CITY_DESIGNS, designFor } from '../app/[locale]/offer/[token]/design';

/**
 * Fouad asked for a distinct design per city, not one template recoloured.
 * These pin the promise: every configured city resolves to its own archetype
 * and its own palette/type/section language, and every archetype has a layout.
 */
describe('per-city offer designs', () => {
  const cities = Object.keys(CITY_DESIGNS);

  it('covers the launched destinations', () => {
    expect(cities).toEqual(expect.arrayContaining([
      'sharm-excursions-online',
      'hurghada-excursions-online',
      'cairo-excursions-online',
      'luxor-excursions',
      'el-gouna',
    ]));
  });

  it('gives every city its own archetype', () => {
    const archetypes = cities.map((city) => CITY_DESIGNS[city].archetype);
    expect(new Set(archetypes).size).toBe(cities.length);
  });

  it('gives every city its own palette, display face and motif', () => {
    const inks = cities.map((city) => CITY_DESIGNS[city].ink);
    const papers = cities.map((city) => CITY_DESIGNS[city].paper);
    const motifs = cities.map((city) => CITY_DESIGNS[city].motif);
    expect(new Set(inks).size).toBe(cities.length);
    expect(new Set(papers).size).toBe(cities.length);
    expect(new Set(motifs).size).toBe(cities.length);
    expect(new Set(cities.map((city) => CITY_DESIGNS[city].display)).size).toBeGreaterThan(2);
  });

  it('writes city-specific section titles rather than one generic set', () => {
    const valueTitles = cities.map((city) => CITY_DESIGNS[city].sections.value);
    expect(new Set(valueTitles).size).toBe(cities.length);
  });

  it('falls back to a defined design for an unknown tenant', () => {
    const fallback = designFor('some-new-tenant');
    expect(fallback.archetype).toBe('reef');
    expect(fallback.paper).toBeTruthy();
  });

  it('implements a layout for every archetype', () => {
    const layouts = readFileSync(
      path.join(process.cwd(), 'app/[locale]/offer/[token]/layouts.tsx'),
      'utf8',
    );
    const exported = layouts.slice(layouts.indexOf('export const LAYOUTS'));
    for (const city of cities) {
      expect(exported).toContain(`${CITY_DESIGNS[city].archetype}:`);
    }
  });

  it('never hardcodes a rating, review count or traveller total in the layouts', () => {
    const layouts = readFileSync(
      path.join(process.cwd(), 'app/[locale]/offer/[token]/layouts.tsx'),
      'utf8',
    );
    expect(layouts).not.toMatch(/\b4\.[5-9]\/5\b/);
    expect(layouts).not.toMatch(/\d+[KM]\+\s*(travellers|travelers|customers)/i);
  });
});

/**
 * A flex column stretches its children. Without an explicit self-* and
 * object-contain the tenant logo is pulled to the full container width while
 * its height stays fixed, and the brand mark renders as a smeared banner
 * (reported live on Hurghada, 13 Aug).
 */
describe('tenant logo rendering', () => {
  const layouts = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/layouts.tsx'),
    'utf8',
  );
  const logoTags = layouts.match(/<img src=\{view\.logo\}[^/]*\/>/g) ?? [];

  it('renders the logo in every layout', () => {
    expect(logoTags.length).toBe(5);
  });

  it('never lets a flex parent stretch the logo out of aspect', () => {
    for (const tag of logoTags) {
      expect(tag).toMatch(/self-(start|center)/);
      expect(tag).toContain('object-contain');
      expect(tag).toContain('w-auto');
      expect(tag).toMatch(/max-w-\[\d+px\]/);
    }
  });
});

/**
 * Mobile is where these links are opened — from WhatsApp. The code panel must
 * sit directly under the headline on a phone, not below the proof list, and no
 * hero may be locked to full viewport height on a small screen.
 */
describe('mobile-first hero behaviour', () => {
  const layouts = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/layouts.tsx'),
    'utf8',
  );

  it('promotes the code panel above the proof list on small screens', () => {
    expect(layouts).toContain('order-2 w-full max-w-md');
    expect(layouts).toContain('order-3 lg:col-start-1 lg:row-start-2');
  });

  it('reserves full-viewport heroes for large screens', () => {
    expect(layouts).not.toMatch(/className="relative min-h-\[92vh\]/);
    expect(layouts).toContain('lg:min-h-[92vh]');
  });

  it('steps every hero headline down on phones', () => {
    const headlines = layouts.match(/className="[^"]*text-\[\d\.\d+rem\][^"]*"/g) ?? [];
    const heroHeadlines = headlines.filter((h) => h.includes('md:text-['));
    expect(heroHeadlines.length).toBeGreaterThanOrEqual(5);
    for (const h of heroHeadlines) {
      expect(h).toMatch(/sm:text-\[|md:text-\[/);
    }
  });
});
