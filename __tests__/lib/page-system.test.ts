import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContentBreadcrumbs } from '@/lib/content/breadcrumbs';
import { normalizePageTemplate } from '@/lib/content/pageTemplate';
import { meetingPointEmbedUrl, meetingPointMapUrl } from '@/lib/tours/meetingPointMap';
import {
  buildDefaultInternalLinkBlock,
  isSafeInternalHref,
  localizeInternalLinkBlock,
  sanitizeInternalLinkBlock,
} from '@/lib/navigation/internalLinks';
import { attractionPagePath, contentPath } from '@/lib/content/contentUrl';

describe('page-system helpers', () => {
  it('keeps every tenant-resolved content route request-dynamic', () => {
    const routes = [
      'app/[locale]/[slug]/page.tsx',
      'app/[locale]/[slug]/[child]/page.tsx',
      'app/[locale]/tour/[slug]/page.tsx',
      'app/[locale]/experience/[slug]/page.tsx',
      'app/[locale]/destination/[slug]/page.tsx',
      'app/[locale]/destinations/[slug]/page.tsx',
      'app/[locale]/categories/[slug]/page.tsx',
      'app/[locale]/attraction/[slug]/page.tsx',
    ];

    for (const route of routes) {
      const source = readFileSync(join(process.cwd(), route), 'utf8');
      expect(source).toMatch(/export const dynamic = ['"]force-dynamic['"];/);
    }
  });

  it('keeps the category wrapper tenant-safe, localized, and URL-type aware', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/[locale]/categories/[slug]/page.tsx'),
      'utf8',
    );

    // The canonical must follow the category's own urlType. Hardcoding the
    // /categories/ shape aimed canonical + every hreflang at a 301, because new
    // categories default to 'direct'.
    expect(source).not.toContain('metadataAlternates(locale, `/categories/${slug}`)');
    expect(source).toMatch(/metadataAlternates\(\s*locale,\s*contentPath\('category',\s*slug,/);
    expect(source).toMatch(/\.select\([^)]*urlType[^)]*parentPage/);

    // The popular-destinations rail joins on ids written straight from the admin
    // body, so the populate is a tenant boundary, not just a publish filter.
    expect(source).toMatch(/match: buildStrictTenantQuery\(\{ isPublished/);

    expect(source).toContain('localizeDestinationRecord(tour.destination, locale)');
    // Assert the behaviour (tour links resolve through contentPath), not the
    // exact indentation — a reformat must not fail the build.
    expect(source).toMatch(/contentPath\(\s*'tour'/);
    expect(source).not.toContain('url: `/${t.slug}`');
  });

  it('builds direct, prefixed, city and parent-owned canonical paths', () => {
    expect(contentPath('tour', 'luxor', 'direct')).toBe('/luxor');
    expect(contentPath('tour', 'luxor', 'tour')).toBe('/tour/luxor');
    expect(contentPath('tour', 'luxor', 'city', 'hurghada')).toBe('/hurghada/luxor');
    expect(attractionPagePath('museum', 'attraction', 'direct', null, 'cairo')).toBe('/cairo/museum');
  });
  it('normalizes the three supported landing templates and fails back to classic', () => {
    expect(normalizePageTemplate('classic')).toBe('classic');
    expect(normalizePageTemplate('editorial')).toBe('editorial');
    expect(normalizePageTemplate('immersive')).toBe('immersive');
    expect(normalizePageTemplate('unknown')).toBe('classic');
  });

  it('builds parent-aware breadcrumbs with the authoritative parent URL', () => {
    expect(buildContentBreadcrumbs({
      currentTitle: 'Luxor day trip',
      breadcrumbLabel: 'Luxor from Hurghada',
      parentPage: {
        id: 'parent',
        slug: 'hurghada',
        label: 'Hurghada',
        kind: 'destination',
        href: '/destinations/hurghada',
      },
      rootLabel: 'Tours',
      rootHref: '/tours',
    })).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Hurghada', href: '/destinations/hurghada' },
      { label: 'Luxor from Hurghada' },
    ]);
  });

  it('creates encoded Google map links only for non-empty meeting points', () => {
    expect(meetingPointMapUrl(' Marina, Hurghada ')).toBe('https://www.google.com/maps/search/?api=1&query=Marina%2C%20Hurghada');
    expect(meetingPointEmbedUrl('Marina, Hurghada')).toBe('https://www.google.com/maps?q=Marina%2C%20Hurghada&output=embed');
    expect(meetingPointMapUrl('   ')).toBeNull();
    expect(meetingPointEmbedUrl(null)).toBeNull();
  });

  it('keeps only safe, complete internal links and localizes with English fallback', () => {
    expect(isSafeInternalHref('/destinations/hurghada')).toBe(true);
    expect(isSafeInternalHref('//attacker.example')).toBe(false);
    expect(isSafeInternalHref('https://attacker.example')).toBe(false);

    const block = sanitizeInternalLinkBlock({
      enabled: true,
      heading: { en: 'Explore Egypt', de: 'Ägypten entdecken' },
      groups: [{
        id: 'destinations',
        title: { en: 'Destinations' },
        links: [
          { id: 'hurghada', label: { en: 'Hurghada' }, href: '/destinations/hurghada' },
          { id: 'external', label: { en: 'Unsafe' }, href: 'https://attacker.example' },
          { id: 'missing-label', label: {}, href: '/missing' },
        ],
      }],
    });

    expect(block.groups[0].links).toHaveLength(1);
    expect(localizeInternalLinkBlock(block, 'de')).toEqual({
      enabled: true,
      heading: 'Ägypten entdecken',
      groups: [{
        id: 'destinations',
        title: 'Destinations',
        links: [{ id: 'hurghada', label: 'Hurghada', href: '/destinations/hurghada' }],
      }],
    });
  });

  it('generates usable default groups and de-duplicates maximum-length ids safely', () => {
    const longId = 'a'.repeat(64);
    const block = buildDefaultInternalLinkBlock([
      { id: longId, title: 'One', items: [{ id: longId, label: 'A', href: '/a' }] },
      { id: longId, title: 'Two', items: [{ id: longId, label: 'B', href: '/b' }] },
    ]);
    expect(block.groups).toHaveLength(2);
    expect(block.groups[0].id).not.toBe(block.groups[1].id);
    expect(block.groups.every((group) => group.id.length <= 64)).toBe(true);
  });
});
