export type TourOwnership = 'all' | 'owned' | 'assigned';

export type TourOwnershipFields = {
  tenantId?: string;
  tenantIds?: string[];
};

export function tourRelationship(
  tour: TourOwnershipFields,
  selectedTenantId: string | null | undefined,
  visibleTenantIds: string[]
): Exclude<TourOwnership, 'all'> {
  const ownerTenantId = tour.tenantId || tour.tenantIds?.[0];
  if (selectedTenantId && selectedTenantId !== 'all') {
    return ownerTenantId === selectedTenantId ? 'owned' : 'assigned';
  }
  return ownerTenantId && visibleTenantIds.includes(ownerTenantId) ? 'owned' : 'assigned';
}

export function filterToursByOwnership<T extends TourOwnershipFields>(
  tours: T[],
  ownership: TourOwnership,
  selectedTenantId: string | null | undefined,
  visibleTenantIds: string[]
): T[] {
  if (ownership === 'all') return tours;
  return tours.filter((tour) => tourRelationship(tour, selectedTenantId, visibleTenantIds) === ownership);
}

