import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

// Attraction, Catalogue and Category are three templates fed by editors that
// offer the same fields. A field the editor accepts but a template never reads
// is invisible data loss — the catalogue template silently swallowed galleries.
const TEMPLATES: Array<[string, string]> = [
  ['Attraction', 'components/AttractionLandingPage.tsx'],
  ['Catalogue', 'components/AttractionPageTemplate.tsx'],
  ['Category', 'app/[locale]/categories/[slug]/CategoryPageClient.tsx'],
];

describe('every page template renders the gallery its editor accepts', () => {
  it.each(TEMPLATES)('%s page renders uploaded gallery images', (_label, file) => {
    const source = read(file);
    // guarded on having images, whether by early return or inline condition
    expect(source).toMatch(/images\.length\s*(>\s*0|===\s*0)/);
    expect(source).toContain('imageMetadataFor');
  });

  it.each(TEMPLATES)('%s page gives each gallery image its SEO alt text', (_label, file) => {
    const source = read(file);
    expect(source).toContain('alt={seo.alt}');
  });
});

describe('category stats never publish invented figures', () => {
  // Phase 2 removed fabricated copy; the stats tiles' '10K+ customers' and
  // '50+ expert guides' fallbacks were the same class and survived it.
  it('has no hardcoded customer or guide counts', () => {
    const source = read('app/[locale]/categories/[slug]/CategoryPageClient.tsx');
    expect(source).not.toContain("'10K+'");
    expect(source).not.toContain("value: '50+'");
  });
  it('hides rating and customer tiles without real data', () => {
    const source = read('app/[locale]/categories/[slug]/CategoryPageClient.tsx');
    expect(source).toContain('if (stats.length === 0) return null;');
  });
});

describe('attraction templates never publish invented figures', () => {
  // Same class as the category strip above, found live on 2026-08-03: the
  // catalogue strip showed '0 Customer Reviews' beside a pinned '4.9' rating
  // and a '24/7' support claim, tour cards invented a 4.5 rating, and the
  // attraction hero pinned 4.8 over a real 0-review count.
  it('catalogue stats tiles carry no hardcoded rating or support claim', () => {
    const source = read('components/AttractionPageTemplate.tsx');
    expect(source).not.toContain('4.9');
    expect(source).not.toContain('24/7');
    expect(source).toContain('if (stats.length === 0) return null;');
  });
  it('tour cards hide the rating badge instead of inventing one', () => {
    const source = read('components/AttractionPageTemplate.tsx');
    expect(source).not.toContain("'4.5'");
  });
  it('attraction hero derives its rating from real reviews or tours and can hide', () => {
    const source = read('components/AttractionLandingPage.tsx');
    expect(source).not.toContain('4.8');
    expect(source).toContain('if (!avgRating && !showActivities) return null;');
  });
});

describe('curated popular destinations override the automatic list', () => {
  it('lets an editor pick them and prefers that choice', () => {
    expect(read('components/admin/CategoryForm.tsx')).toContain('popularDestinationIds');
    const page = read('app/[locale]/categories/[slug]/CategoryPageClient.tsx');
    expect(page).toContain('curatedPopularDestinations.length > 0');
  });
});
