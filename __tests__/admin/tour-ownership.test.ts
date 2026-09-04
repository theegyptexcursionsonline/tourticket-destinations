import { filterToursByOwnership, tourRelationship } from '@/lib/admin/tourOwnership';

const tours = [
  { tenantId: 'brand-a', tenantIds: ['brand-a'] },
  { tenantId: 'brand-b', tenantIds: ['brand-b', 'brand-a'] },
];

describe('tour ownership', () => {
  it('separates owned and assigned tours for the selected brand', () => {
    expect(filterToursByOwnership(tours, 'owned', 'brand-a', []).length).toBe(1);
    expect(filterToursByOwnership(tours, 'assigned', 'brand-a', []).length).toBe(1);
    expect(tourRelationship(tours[1], 'brand-a', [])).toBe('assigned');
  });
});
