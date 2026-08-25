export {};
// The hand-off between "Book" and checkout. It used to hold every customer on
// a hardcoded 3-second setTimeout, at the exact moment they had decided to pay,
// and advertise the wait as "~3 seconds" — for work that was not happening.
const fs = require('fs');
const path = require('path');
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const PAGE = 'app/[locale]/redirecting/page.tsx';
const LOCALES = ['en', 'de', 'fr', 'es', 'ar', 'ru'];

describe('checkout interstitial', () => {
  it('does not park the customer on a fixed delay', () => {
    const src = read(PAGE);
    expect(src).not.toContain('REDIRECT_DELAY = 3000');
    expect(src).toContain('router.prefetch(destination)');
    expect(src).toMatch(/const MIN_VISIBLE_MS = (\d+);/);
    const floor = Number(src.match(/const MIN_VISIBLE_MS = (\d+);/)![1]);
    const ceiling = Number(src.match(/const MAX_WAIT_MS = (\d+);/)![1]);
    expect(floor).toBeLessThanOrEqual(500);
    expect(ceiling).toBeLessThanOrEqual(2000);
    expect(ceiling).toBeGreaterThan(floor);
  });

  it('replaces the history entry so Back does not re-enter the interstitial', () => {
    const src = read(PAGE);
    expect(src).toContain('router.replace(destination)');
    expect(src).not.toContain('router.push(destination)');
  });

  it('navigates once, and offers a real link if it is still on screen', () => {
    const src = read(PAGE);
    expect(src).toContain('if (navigated.current) return;');
    expect(src).toMatch(/<a\s+href=\{destination\}/);
    expect(src).toContain("t('continueManually')");
  });

  it('keeps the redirect target relative — this page WAS an open redirect', () => {
    const src = read(PAGE);
    // It read `searchParams.get('to') || '/checkout'` and pushed it unchecked,
    // so /redirecting?to=https://attacker.example forwarded the customer off
    // site from the payment step.
    expect(src).toContain("safeRelativeRedirect(searchParams.get('to'), '/checkout')");
    expect(src).not.toMatch(/searchParams\.get\('to'\) \|\| '\/checkout'/);
    const guard = read('lib/security/safeRedirect.ts');
    expect(guard).toContain("value.startsWith('//')");
  });

  it('shows the tour being bought, never bundled stock art', () => {
    const src = read(PAGE);
    expect(src).toContain("searchParams.get('image')");
    // The old default was a Chinese travel promo (十一去哪儿) shipped in public/.
    expect(src).not.toContain('newimage');
    expect(fs.existsSync(path.join(__dirname, '..', 'public', 'newimage.png!bw700'))).toBe(false);
    for (const caller of ['components/CartSidebar.tsx', 'components/BookingSidebar.tsx']) {
      expect(read(caller)).toContain('&image=${encodeURIComponent(');
    }
  });

  it('is announced to screen readers and honours reduced motion', () => {
    const src = read(PAGE);
    expect(src).toContain('role="status"');
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain('useSyncExternalStore(');
    expect(src).toContain('window.matchMedia(REDUCED_MOTION_QUERY)');
    // An effect that seeds state synchronously costs a cascading render on a
    // screen whose whole job is to be quick.
    expect(src).not.toMatch(/useEffect\(\(\) => \{\s*\n\s*const query = window\.matchMedia/);
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it.each(LOCALES)('%s stops promising a countdown and defines the new copy', (locale) => {
    const ns = JSON.parse(read(`messages/${locale}.json`)).redirectingPage;
    expect(ns.eta).toBeUndefined();
    expect(ns.estimatedTime).toBeUndefined();
    for (const key of ['badge', 'title', 'description', 'secureNote', 'continueManually', 'imageAlt', 'defaultTourName']) {
      expect(typeof ns[key]).toBe('string');
      expect(ns[key].length).toBeGreaterThan(0);
    }
    expect(ns.title).toContain('{tourName}');
    expect(ns.description).not.toMatch(/few seconds|Sekunden|segundos|secondes/i);
  });
});
