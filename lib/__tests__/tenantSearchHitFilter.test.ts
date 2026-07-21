import { filterTourSearchHitsByTenant } from '../tenantSearchHitFilter';

describe('filterTourSearchHitsByTenant', () => {
  const englishHit = {
    objectID: 'tour-en',
    tenantId: 'sharm-excursions',
    slug: 'sharm-safari',
    title: 'Sharm Safari with Camel Ride and Dinner',
    duration: '6 hours',
  };
  const germanHit = {
    objectID: 'tour-de',
    tenantId: 'sharm-excursions',
    slug: 'sharm-safari',
    title: 'Sharm Safari mit Kamel und Abendessen',
    duration: '6 Stunden',
  };

  it('keeps the English record once and excludes another tenant', () => {
    const results = filterTourSearchHitsByTenant(
      [englishHit, germanHit, { ...englishHit, objectID: 'other', tenantId: 'makadi-bay' }],
      'sharm-excursions',
      'en'
    );

    expect(results).toHaveLength(1);
    expect(results[0].objectID).toBe('tour-en');
  });

  it('removes a German-only orphan from an English storefront', () => {
    expect(filterTourSearchHitsByTenant([germanHit], 'sharm-excursions', 'en')).toEqual([]);
  });
});
