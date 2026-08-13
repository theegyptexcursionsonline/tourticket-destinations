import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(
  path.join(process.cwd(), 'components/EEOSearchConcierge.tsx'),
  'utf8',
);

/**
 * The launcher must stay off transactional and single-CTA surfaces. Planner
 * offer pages are the newest member of that list: the page exists to move one
 * customer to checkout with their code, and a floating search bar both covers
 * the sticky offer bar and invites them to browse away from the offer.
 */
describe('search concierge hidden routes', () => {
  const hidden = source.match(/const HIDDEN_ROUTES = \[([\s\S]*?)\];/)?.[1] ?? '';

  it.each(['/offer', '/checkout', '/booking', '/payment', '/admin', '/login', '/signup'])(
    'suppresses the launcher on %s',
    (route) => {
      expect(hidden).toContain(`'${route}'`);
    },
  );

  it('matches nested paths under a hidden route, not just the exact path', () => {
    expect(source).toContain('normalizedPath.startsWith(`${route}/`)');
  });

  it('strips the locale prefix before matching so /en/offer/... is covered', () => {
    expect(source).toContain("pathname.replace(/^\\/(en|ar|de|fr|es)(?=\\/|$)/, '')");
  });
});
