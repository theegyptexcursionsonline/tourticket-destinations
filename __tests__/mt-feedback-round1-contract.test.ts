import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('Category and Catalogue use the client vocabulary', () => {
  // A tour collection is a "Category"; the landing page built on one is a
  // "Catalogue". Stored kinds are unchanged — these are labels only.
  const list = read('app/admin/pages/page.tsx');

  it('labels the list badges the way the client names them', () => {
    expect(list).toContain("'category-landing': 'Catalogue'");
    expect(list).toContain("category: 'Category'");
  });

  it('labels the type filter and count cards to match', () => {
    expect(list).toContain('<option value="category-landing">Catalogue</option>');
    expect(list).toContain('<option value="category">Category</option>');
  });

  it('labels the create chooser and the page-type toggle to match', () => {
    expect(read('app/admin/pages/create/page.tsx')).toContain("id: 'catalogue', label: 'Category'");
    expect(read('components/admin/AttractionPageForm.tsx')).toContain("['category', 'Catalogue']");
  });
});

describe('newly created categories are selectable on a tour', () => {
  it('lets the admin picker ask for categories that have no tours yet', () => {
    expect(read('app/api/categories/route.ts')).toContain('requireTours: !includeEmpty');
    expect(read('components/TourForm.tsx')).toContain('includeEmpty=true');
  });
});

describe('destination tour pickers stay inside the selected brand', () => {
  const manager = read('app/admin/destinations/DestinationManager.tsx');

  it('never fetches the tour list without a brand scope', () => {
    // the unscoped shapes this bug shipped as
    expect(manager).not.toContain("fetch('/api/admin/tours')");
    expect(manager).not.toContain('fetch(`/api/admin/tours`)');
  });

  it('passes the selected brand into both tour-list fetches', () => {
    expect(manager).toContain("params.set('tenantId', selectedTenantId)");
    expect(manager).toContain('tenantId=${encodeURIComponent(selectedTenantId)}');
  });

  it('refetches when the brand changes rather than caching the first brand', () => {
    expect(manager).toContain('}, [selectedTenantId]);');
  });
});

describe('destination pages honour the meta title an editor sets', () => {
  const page = read('app/[locale]/destinations/[slug]/page.tsx');

  it('reads the SEO fields it needs', () => {
    expect(page).toContain('metaTitle metaDescription');
  });

  it('prefers the editor value and keeps the generated one as fallback', () => {
    expect(page).toContain('const title = metaTitle ||');
    expect(page).toContain('const description = metaDescription');
  });
});

describe('readability fixes', () => {
  it('lets the tour description use the full column width', () => {
    const tour = read('app/[locale]/[slug]/TourDetailClientPage.tsx');
    expect(tour).toContain('className="mb-8 w-full"');
    expect(tour).toContain('prose prose-slate max-w-none');
  });

  it('uses a light palette for hero text sitting on the photo', () => {
    const attraction = read('components/AttractionLandingPage.tsx');
    const start = attraction.indexOf('const QuickInfo');
    const block = attraction.slice(start, start + 1400);
    expect(block).toContain('text-white/80');
    expect(block).toContain('bg-white/40');
    expect(block).not.toContain('text-slate-600');
    expect(block).not.toContain('bg-slate-300');
  });
});

describe('each tenant sitemap publishes its own domain', () => {
  const sitemap = read('app/sitemap.ts');

  it('resolves the tenant by request host when the header is missing', () => {
    expect(sitemap).toContain('getTenantByDomain(requestHost)');
  });

  it('falls back to the host that served the request, never a fixed brand', () => {
    expect(sitemap).toContain('`https://${requestHost}`');
    // the old shape published another brand's URLs to every tenant
    expect(sitemap).not.toContain(
      "const baseUrl = tenantConfig \n      ? `https://${tenantConfig.domain}`",
    );
  });
});
