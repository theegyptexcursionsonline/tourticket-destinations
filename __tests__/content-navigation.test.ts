import { attractionPagePath, contentPath } from '@/lib/content/contentUrl';
import { nestedContentPath, sanitizeContentNavigation, systemParentPage } from '@/lib/content/contentNavigation';

describe('content navigation', () => {
  it('sanitizes a valid parent snapshot and breadcrumb label', () => {
    expect(sanitizeContentNavigation({
      breadcrumbLabel: '  Nile cruises  ',
      parentPage: { id: '64b64c9bfc13ae1f19e8a001', slug: 'nile-river', label: 'Nile River', kind: 'destination' },
    })).toEqual({
      breadcrumbLabel: 'Nile cruises',
      parentPage: { id: '64b64c9bfc13ae1f19e8a001', slug: 'nile-river', label: 'Nile River', kind: 'destination' },
    });
  });

  it('fails closed for unsafe navigation input', () => {
    expect(sanitizeContentNavigation({ title: 'Only title changed' })).toEqual({});
    expect(sanitizeContentNavigation({ parentPage: { slug: '../admin', label: 'Unsafe', kind: 'destination' } }))
      .toEqual({ parentPage: null });
  });

  it('uses the selected parent as the canonical path for every content type', () => {
    expect(nestedContentPath('luxor-day-trip', { slug: 'hurghada', label: 'Hurghada', kind: 'destination' }))
      .toBe('/hurghada/luxor-day-trip');
    expect(contentPath('tour', 'luxor-day-trip', 'tour', null, 'hurghada')).toBe('/hurghada/luxor-day-trip');
    expect(attractionPagePath('desert-safari', 'category', 'default', null, 'hurghada'))
      .toBe('/hurghada/desert-safari');
  });

  it('accepts only the allowlisted Egypt landing page as a static parent', () => {
    const egypt = systemParentPage('landing:egypt');
    expect(egypt).toEqual(expect.objectContaining({ slug: 'egypt', kind: 'landing', href: '/egypt' }));
    expect(systemParentPage('landing:admin')).toBeNull();
  });
});

