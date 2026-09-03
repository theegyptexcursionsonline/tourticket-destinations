import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('Category and Catalogue use the client vocabulary', () => {
  // A tour collection is a "Category"; the landing page built on one is a
  // "Category 2" (client sheet 02.08 N2). Stored kinds are unchanged — labels only.
  const list = read('app/admin/pages/page.tsx');

  it('labels the list badges the way the client names them', () => {
    expect(list).toContain("'category-landing': 'Category 2'");
    expect(list).toContain("category: 'Category'");
  });

  it('labels the type filter and count cards to match', () => {
    expect(list).toContain('<option value="category-landing">Category 2</option>');
    expect(list).toContain('<option value="category">Category</option>');
  });

  it('labels the create chooser and the page-type toggle to match', () => {
    expect(read('app/admin/pages/create/page.tsx')).toContain("id: 'catalogue', label: 'Category'");
    expect(read('components/admin/AttractionPageForm.tsx')).toContain("['category', 'Category 2']");
  });
});

describe('newly created categories are selectable on a tour', () => {
  it('lets the admin picker ask for categories that have no tours yet', () => {
    expect(read('app/api/categories/route.ts')).toContain('requireTours: !includeEmpty');
    expect(read('components/TourForm.tsx')).toContain('includeEmpty=true');
  });
});

describe('pricing and availability use one complete editor workflow', () => {
  const form = read('components/TourForm.tsx');

  it('keeps availability inside Pricing & Details instead of a separate tab', () => {
    expect(form).not.toContain("{ id: 'availability', label: 'Availability'");
    expect(form).toContain('Availability & scheduling');
  });

  it('lets each option select universal slots and override their price', () => {
    expect(form).toContain('handleBookingOptionSlotToggle');
    expect(form).toContain('handleBookingOptionSlotPrice');
    expect(form).toContain('Leave the price blank to inherit this option&apos;s base price.');
  });

  it('lets a universal slot define an optional fallback price', () => {
    expect(form).toContain('Base slot price (optional)');
    expect(read('lib/models/Tour.ts')).toContain('Optional universal fallback price');
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
    const block = attraction.slice(start, attraction.indexOf('\n};', start));
    expect(block).toContain('text-white/80');
    expect(block).toContain('bg-white/40');
    expect(block).not.toContain('text-slate-600');
    expect(block).not.toContain('bg-slate-300');
  });
});

describe('practical information is explicit, not invented', () => {
  const editor = read('components/TourForm.tsx');

  it('offers explicit recommended defaults without filling them automatically', () => {
    expect(editor).toContain('practicalDefaultText');
    expect(editor).toContain('Use recommended default');
    expect(editor).toContain('defaultKey="whatToBring"');
    expect(editor).toContain('defaultKey="accessibilityInfo"');
  });

  it.each([
    'app/[locale]/[slug]/TourDetailClientPage.tsx',
  ])('%s hides empty fields rather than publishing generic promises', (file) => {
    const source = read(file);
    expect(source).not.toContain('SMART fallbacks');
    expect(source).not.toContain('Comfortable walking shoes');
    expect(source).not.toContain('Please inform us of any special requirements when booking');
    expect(source).toContain('cleanPracticalList');
    expect(source).toContain('cleanPracticalText');
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

describe('catalogue page creation reports what actually went wrong', () => {
  const route = read('app/api/admin/attraction-pages/route.ts');

  it('maps a duplicate slug to a conflict instead of an unknown failure', () => {
    expect(route).toContain('mongoError?.code === 11000');
    expect(route).toContain('status: 409');
  });

  it('does not report a saved page as failed because populate threw', () => {
    expect(route).toContain('Created page but could not populate category');
  });

  it('shows the reason in the admin form rather than a generic message', () => {
    expect(read('components/admin/AttractionPageForm.tsx'))
      .toContain("[data.error, data.details].filter(Boolean).join(' — ')");
  });
});

describe('curated content reaches the live site promptly', () => {
  it('tags storefront responses so they can be purged', () => {
    expect(read('proxy.ts')).toContain("'Netlify-Cache-Tag'");
  });

  it('purges the edge cache on save without blocking or failing it', () => {
    const revalidate = read('lib/storefront/revalidateTourStorefront.ts');
    expect(revalidate).toContain('void purgeStorefrontCdnCache(tenantId)');
    const purge = read('lib/storefront/purgeCdnCache.ts');
    expect(purge).toContain('NETLIFY_PURGE_TOKEN');
    // missing config must degrade, not throw
    expect(purge).toContain('return false;');
  });
});

describe('destinations can be translated from the admin', () => {
  const manager = read('app/admin/destinations/DestinationManager.tsx');

  it('offers a Translations tab', () => {
    expect(manager).toContain("{ id: 'translations', label: 'Translations'");
    expect(manager).toContain('<TranslationEditor');
  });

  it('never blanks existing locales from a form that did not load them', () => {
    expect(manager).toContain('hasTranslations ? { translations } : {}');
  });
});

describe('tour editor pickers are searchable', () => {
  const form = read('components/TourForm.tsx');

  it.each(['categories', 'attractions', 'Category 2 pages'])(
    'offers a search box for %s',
    (label) => {
      expect(form).toContain(`searchPlaceholder="Search ${label}…"`);
    },
  );

  it('shows the search box regardless of how short the list is', () => {
    // a box that disappears on short lists is the same complaint again
    expect(read('components/admin/SearchableCheckboxList.tsx')).toContain('searchThreshold = 0');
  });

  it('no longer renders the unfiltered scrolling checkbox list', () => {
    expect(form).not.toContain('{categories.map((cat) => {');
  });
});

// Every fix made on the main site is owed here (MT sheet item 13). These
// assertions exist because several were shipped to one platform only and
// reported as done for both — the client found them, not us.
describe('fixes made on the main site are present here too', () => {
  it.each([
    ['Features label', 'components/admin/AttractionPageForm.tsx', '(What Makes This Special)'],
    ['listings label', 'components/admin/AttractionPageForm.tsx', 'Other page listings (attractions and categories)'],
    ['catalogue hides FAQs/tips', 'components/admin/AttractionPageForm.tsx', "formData.pageType === 'attraction' && ("],
    ['itinerary stop titles', 'components/TourForm.tsx', 'day.title?.trim()'],
    ['itinerary includes field', 'components/TourForm.tsx', 'handleItineraryIncludesChange'],
    ['searchable pickers', 'components/TourForm.tsx', 'SearchableCheckboxList'],
    ['tours list opens as a table', 'app/admin/tours/ToursListClient.tsx', "useState<'table' | 'cards'>('table')"],
    ['archived is its own tab', 'app/admin/tours/ToursListClient.tsx', "id: 'archived' as TabFilter"],
    ['hero images reorder', 'app/admin/hero-settings/page.tsx', 'Move image earlier'],
    ['pages remember filters', 'app/admin/pages/page.tsx', 'window.history.replaceState'],
    ['catalogue listing copy is editor-controlled', 'components/AttractionPageTemplate.tsx', '<LinkedPageCardsSection'],
    ['attraction highlights always show', 'components/AttractionLandingPage.tsx', 'Highlights must not depend on the expanded state'],
  ])('%s', (_label, file, needle) => {
    expect(read(file)).toContain(needle);
  });
});
