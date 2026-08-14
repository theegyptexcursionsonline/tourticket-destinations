import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('storefront taxonomy parity', () => {
  it.each([
    'components/Header.tsx',
    'components/Header2.tsx',
    'components/Headersearch.tsx',
    'components/Footer.tsx',
    'components/Destinations.tsx',
    'components/DestinationsServer.tsx',
    'components/InterestGridServer.tsx',
    'components/HeroSection.tsx',
    'app/[locale]/destinations/DestinationsClientPage.tsx',
    'app/[locale]/destinations/[slug]/DestinationPageClient.tsx',
    'app/[locale]/categories/[slug]/CategoryPageClient.tsx',
  ])('%s builds taxonomy links through a canonical URL helper', (file) => {
    const fileSource = source(file);
    expect(fileSource).toMatch(/contentPath|getTenantDestinationHref|getTenantCategoryHref/);
    expect(fileSource).not.toMatch(/href=\{`\/(?:categories|destinations)\/\$\{/);
  });

  it('keeps archived and empty taxonomy records out of homepage navigation', () => {
    const home = source('app/[locale]/HomePageServer.tsx');
    expect(home).toContain('archivedAt: null');
    expect(home).toMatch(/\.filter\(\(category: any\) => category\.tourCount > 0\)/);
    expect(home).toMatch(/\.filter\(\(destination: any\) => destination\.tourCount > 0\)/);
  });

  it('renders real category images and attraction pages on Egypt', () => {
    const egypt = source('app/[locale]/egypt/page.tsx');
    expect(egypt).toContain("heroImage: { $exists: true, $ne: '' }");
    expect(egypt).toMatch(/src=\{[^}]*category[^}]*heroImage/);
    expect(egypt).toContain('Discover Top Attractions');
    expect(egypt).toContain("pageType: 'attraction'");
    expect(egypt).toContain('attractionPagePath(');
  });

  it('keeps list APIs and the tours index tenant scoped and archive safe', () => {
    for (const file of [
      'app/api/categories/route.ts',
      'app/api/destinations/route.ts',
      'app/api/interests/route.ts',
      'app/[locale]/tours/page.tsx',
    ]) {
      const fileSource = source(file);
      expect(fileSource).toContain('archivedAt: null');
      expect(fileSource).toMatch(/buildStrictTenantQuery|buildTenantQuery/);
    }
  });

  it('keeps dark-mode practical-information text readable', () => {
    const css = source('app/globals.css');
    expect(css).toContain('[class~="text-gray-800"]');
    expect(css).toContain('[class~="text-gray-900"]');
    expect(css).toContain('[class~="text-slate-600"]');
    expect(css).toContain('color: #f8fafc !important;');
    expect(css).toContain('color: #cbd5e1 !important;');
  });
});
