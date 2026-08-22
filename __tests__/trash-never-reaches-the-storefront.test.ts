import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

/**
 * Parity with the EEO fix (client report 2026-08-21): deleted/draft records
 * were reaching customers through reads that filtered on neither
 * `isPublished` nor `archivedAt`. On this network destinations are
 * hard-deleted, so the guard for them reduces to `isPublished`; tours,
 * categories and attraction pages carry `archivedAt` and must exclude it.
 */
describe('storefront destination reads exclude drafts and trash', () => {
  const page = read('app/[locale]/destinations/[slug]/page.tsx');

  it('the related-destinations query is published-only (the reported leak)', () => {
    const start = page.indexOf('DestinationModel.find({');
    const related = page.slice(start, start + 400);
    expect(related).toContain('PUBLIC_CONTENT_FILTER');
  });

  it('the category rail is tenant-scoped and published-only instead of find({})', () => {
    expect(page).not.toMatch(/CategoryModel\.find\(buildStrictTenantQuery\(\{\},/);
    const categories = page.slice(page.indexOf('CategoryModel.find('), page.indexOf('CategoryModel.find(') + 160);
    expect(categories).toContain('PUBLIC_CONTENT_FILTER');
  });

  it('the destination tour list carries the archived belt as well as isPublished', () => {
    const tours = page.slice(page.indexOf('TourModel.find({'), page.indexOf('TourModel.find({') + 260);
    expect(tours).toContain('PUBLIC_CONTENT_FILTER');
  });

  it('the destinations index lists published destinations only', () => {
    const index = read('app/[locale]/destinations/page.tsx');
    expect(index).toMatch(/Destination\.find\(buildStrictTenantQuery\(\{ \.\.\.PUBLIC_CONTENT_FILTER \}/);
  });
});

describe('an archived tour cannot be served by slug', () => {
  const detail = read('app/[locale]/[slug]/TourDetailContent.tsx');

  it('both slug candidate lookups exclude archived tours but keep drafts resolvable', () => {
    const lookups = detail.match(/Tour\.find\(buildStrictTenantQuery\(\{ slug[^)]*\}/g) || [];
    expect(lookups.length).toBe(2);
    for (const lookup of lookups) {
      expect(lookup).toContain('NOT_ARCHIVED_FILTER');
      expect(lookup).not.toContain('isPublished');
    }
  });

  it('related tours are published and not archived', () => {
    const related = detail.slice(detail.indexOf('const relatedTours'), detail.indexOf('const relatedTours') + 320);
    expect(related).toContain('PUBLIC_CONTENT_FILTER');
  });
});

describe('slug resolution and the sitemap cannot surface trash', () => {
  it('every content lookup in the resolver excludes archived records at the source', () => {
    const resolver = read('lib/content/resolveContentBySlug.ts');
    const lookups = resolver.match(/(Tour|Destination|Category|AttractionPage)\.findOne\(scoped\(\{[^)]*\}\)\)/g) || [];
    expect(lookups.length).toBe(4);
    for (const lookup of lookups) expect(lookup).toContain('NOT_ARCHIVED_FILTER');
  });

  it('the sitemap composes the public filter for every content model', () => {
    const sitemap = read('app/sitemap.ts');
    for (const model of ['Tour', 'Destination', 'Category', 'AttractionPage']) {
      expect(sitemap).toContain(`${model}.find({ ...tenantFilter, ...PUBLIC_CONTENT_FILTER })`);
    }
  });

  it('the filter helper matches documents that never had an archivedAt field', () => {
    const helper = read('lib/content/publicContentFilter.ts');
    expect(helper).toContain('archivedAt: null');
    expect(helper).toContain('isPublished: true');
  });
});
