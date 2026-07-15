import {
  getBrandAssignmentSummary,
  getTourBrandIds,
  groupToursBySlugForAllBrands,
} from '@/lib/admin/tourBrandAssignments';

describe('network tour brand assignments', () => {
  const tours = [
    { _id: 'default-copy', slug: 'orange-bay', tenantId: 'default', tenantIds: ['default', 'hurghada-excursions-online'] },
    { _id: 'german-copy', slug: 'orange-bay', tenantId: 'hurghada-ausfluege', tenantIds: ['hurghada-ausfluege'] },
    { _id: 'direct', slug: 'city-tour', tenantId: 'hurghada-excursions-online' },
  ];

  it('combines primary and shared brand assignments without duplicates', () => {
    expect(getTourBrandIds({
      tenantId: 'default',
      tenantIds: ['default', 'hurghada-excursions-online', 'hurghada-excursions-online'],
    })).toEqual(['default', 'hurghada-excursions-online']);
  });

  it('groups language copies while preserving every direct and shared brand', () => {
    expect(groupToursBySlugForAllBrands(tours)).toEqual([
      expect.objectContaining({
        _id: 'default-copy',
        tenantCopies: ['default', 'hurghada-excursions-online', 'hurghada-ausfluege'],
      }),
      expect.objectContaining({ _id: 'direct', tenantCopies: ['hurghada-excursions-online'] }),
    ]);
  });

  it('reports direct and shared assignments separately for the selected brand', () => {
    expect(getBrandAssignmentSummary(tours, 'hurghada-excursions-online')).toEqual({
      direct: 1,
      shared: 1,
      total: 2,
    });
  });
});
