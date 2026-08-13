import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CITY_DESIGNS, designFor } from '../app/[locale]/offer/[token]/design';

/**
 * Client decision 2026-08-14: exactly THREE approved design concepts across
 * all offer pages — reef (Sharm), marina (Hurghada), lagoon (El Gouna).
 * Every city maps into that set while keeping its own palette/type/section
 * language, and every approved archetype has a layout.
 */
const APPROVED_ARCHETYPES = ['reef', 'marina', 'lagoon'] as const;

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

  it('only uses the three client-approved design concepts', () => {
    for (const city of cities) {
      expect(APPROVED_ARCHETYPES).toContain(CITY_DESIGNS[city].archetype);
    }
    // The anchor cities keep the concept the client approved them under.
    expect(CITY_DESIGNS['sharm-excursions-online'].archetype).toBe('reef');
    expect(CITY_DESIGNS['hurghada-excursions-online'].archetype).toBe('marina');
    expect(CITY_DESIGNS['el-gouna'].archetype).toBe('lagoon');
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
    expect(logoTags.length).toBe(3);
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
    expect(heroHeadlines.length).toBeGreaterThanOrEqual(3);
    for (const h of heroHeadlines) {
      expect(h).toMatch(/sm:text-\[|md:text-\[/);
    }
  });
});

/**
 * The phone action bar must not cover the hero it advertises, and it must not
 * print raw hours ("ENDS IN 177:57:47") once the offer runs longer than a day.
 */
describe('mobile action bar', () => {
  const primitives = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/primitives.tsx'),
    'utf8',
  );
  const bar = primitives.slice(primitives.indexOf('export function StickyBar'));

  it('waits until the hero code has scrolled away', () => {
    expect(bar).toContain('window.scrollY > 460');
    expect(bar).toContain('pointer-events-none translate-y-6 opacity-0');
  });

  it('counts remaining time in days once past 24 hours', () => {
    expect(bar).toMatch(/days > 0 \? `\$\{days\}d/);
    expect(bar).not.toMatch(/Ends in \$\{pad\(hours\)\}:\$\{pad\(minutes\)\}:\$\{pad\(seconds\)\}`/);
  });
});

/**
 * Conversion mechanics added on request (13 Aug): an ambient shimmer on the
 * primary CTAs and an exit-intent rescue. Both must stay honest and polite:
 * shimmer dies under prefers-reduced-motion, the rescue fires once per
 * session, desktop pointers only, and is a real accessible dialog.
 */
describe('shimmer + exit intent', () => {
  const luxe = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/luxe.tsx'),
    'utf8',
  );
  const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');
  const dispatcher = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/OfferPageClient.tsx'),
    'utf8',
  );

  it('gives the primary CTA an ambient sheen that respects reduced motion', () => {
    expect(luxe).toContain('offer-sheen offer-sheen-auto');
    expect(css).toContain('@keyframes offer-sheen-loop');
    const reducedBlock = css.slice(css.lastIndexOf('prefers-reduced-motion'));
    expect(reducedBlock).toContain('.offer-sheen-auto { animation: none; }');
  });

  it('fires the exit rescue once per session, desktop pointers only', () => {
    expect(luxe).toContain("sessionStorage.getItem(key)");
    expect(luxe).toContain("matchMedia('(pointer: fine)')");
    expect(luxe).toContain('event.clientY > 0 || event.relatedTarget');
  });

  it('renders the rescue as an accessible dialog with honest content only', () => {
    const rescue = luxe.slice(luxe.indexOf('export function ExitRescue'));
    expect(rescue).toContain('role="dialog"');
    expect(rescue).toContain('aria-modal="true"');
    expect(rescue).toContain("event.key === 'Escape'");
    expect(rescue).not.toMatch(/\d+% claimed|only \d+ left|people are looking/i);
  });

  it('is mounted once for every archetype from the dispatcher', () => {
    expect(dispatcher).toContain('<ExitRescue');
  });
});

/**
 * Client feedback 2026-08-14 on the bundles section: exactly three bundle
 * listings per page, and each bundle carries real benefit bullets rendered
 * BEFORE the price row ("Under each bundle, we need to add some details
 * text, as the benefit of this bundle … before the price").
 */
describe('bundle listings contract (client 14/08)', () => {
  const page = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/page.tsx'),
    'utf8',
  );
  const layouts = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/layouts.tsx'),
    'utf8',
  );
  const primitives = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/primitives.tsx'),
    'utf8',
  );

  it('caps the bundles section at exactly three listings', () => {
    expect(page).toContain('const BUNDLE_COUNT = 3;');
  });

  it('sources benefit bullets from real tour highlights only', () => {
    expect(page).toMatch(/\.select\('[^']*highlights[^']*'\)/);
    expect(primitives).toContain('if (tour.highlights.length === 0) return null;');
  });

  it('renders benefits before the price on every bundle card', () => {
    // Each approved archetype card: the BundleBenefits mount must appear
    // before that card's offerPrice line.
    for (const card of ['function ReefCard', 'function StubCard', 'function LookCard']) {
      const start = layouts.indexOf(card);
      expect(start).toBeGreaterThan(-1);
      const next = layouts.indexOf('function ', start + card.length);
      const body = layouts.slice(start, next === -1 ? undefined : next);
      const benefitsAt = body.indexOf('<BundleBenefits');
      const priceAt = body.indexOf('tour.offerPrice');
      expect(benefitsAt).toBeGreaterThan(-1);
      expect(priceAt).toBeGreaterThan(-1);
      expect(benefitsAt).toBeLessThan(priceAt);
    }
  });

  it('passes benefits into the bundles section of every layout, not the picks', () => {
    const bundleMaps = layouts.match(/view\.bundles\.map[\s\S]{0,220}?benefits\s*\/>/g) || [];
    expect(bundleMaps.length).toBe(3);
    expect(layouts).not.toMatch(/view\.picks\.map[\s\S]{0,220}?benefits\s*\/>/);
  });
});

/**
 * Offer pages are art-directed with fixed inline palettes, so the storefront
 * dark remap turned them into a light/dark patchwork (client report 14/08).
 * The route must pin its designed look pre-paint and hand the visitor's
 * theme back on exit.
 */
describe('offer route theme pin', () => {
  const layout = readFileSync(path.join(process.cwd(), 'app/[locale]/offer/layout.tsx'), 'utf8');
  const pin = readFileSync(path.join(process.cwd(), 'app/[locale]/offer/theme.tsx'), 'utf8');
  const scanner = readFileSync(path.join(process.cwd(), 'scripts/theme/scanStorefront.ts'), 'utf8');

  it('pins the designed palette before first paint on hard loads', () => {
    expect(layout).toContain("dataset.storefrontTheme='light'");
    expect(layout).toContain('offer-theme-pin');
  });

  it('restores the visitor saved/system theme when leaving the route', () => {
    expect(pin).toContain('STOREFRONT_THEME_STORAGE_KEY');
    expect(pin).toContain("matchMedia('(prefers-color-scheme: dark)')");
    expect(pin).toMatch(/return \(\) => \{/);
  });

  it('keeps offer-only utilities out of the generated dark map', () => {
    expect(scanner).toMatch(/EXCLUDED = .*\|offer\|/);
  });
});
