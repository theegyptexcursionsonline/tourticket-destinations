export type BrandAssignedTour = {
  _id: string;
  slug?: string;
  tenantId?: string;
  tenantIds?: string[];
  tenantCopies?: string[];
};

export function getTourBrandIds(tour: Pick<BrandAssignedTour, 'tenantId' | 'tenantIds'>): string[] {
  return Array.from(new Set([
    tour.tenantId,
    ...(Array.isArray(tour.tenantIds) ? tour.tenantIds : []),
  ].filter((tenantId): tenantId is string => Boolean(tenantId))));
}

export function groupToursBySlugForAllBrands<T extends BrandAssignedTour>(tours: T[]): T[] {
  const bySlug = new Map<string, { canonical: T; brandIds: Set<string> }>();

  for (const tour of tours) {
    const key = tour.slug || `__no-slug__${tour._id}`;
    const brandIds = getTourBrandIds(tour);
    const existing = bySlug.get(key);

    if (!existing) {
      bySlug.set(key, { canonical: tour, brandIds: new Set(brandIds) });
      continue;
    }

    brandIds.forEach((brandId) => existing.brandIds.add(brandId));
    if (tour.tenantId === 'default' && existing.canonical.tenantId !== 'default') {
      existing.canonical = tour;
    }
  }

  return Array.from(bySlug.values()).map(({ canonical, brandIds }) => ({
    ...canonical,
    tenantCopies: Array.from(brandIds),
  }));
}

export function getBrandAssignmentSummary<T extends BrandAssignedTour>(tours: T[], brandId: string) {
  const direct = tours.filter((tour) => tour.tenantId === brandId).length;
  const shared = tours.filter((tour) => (
    tour.tenantId !== brandId && getTourBrandIds(tour).includes(brandId)
  )).length;

  return { direct, shared, total: direct + shared };
}
