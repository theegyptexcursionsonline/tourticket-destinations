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

describe('curated popular destinations override the automatic list', () => {
  it('lets an editor pick them and prefers that choice', () => {
    expect(read('components/admin/CategoryForm.tsx')).toContain('popularDestinationIds');
    const page = read('app/[locale]/categories/[slug]/CategoryPageClient.tsx');
    expect(page).toContain('curatedPopularDestinations.length > 0');
  });
});
