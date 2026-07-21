export interface CuratableTour {
  _id?: unknown;
  isFeatured?: boolean;
}

const idOf = (tour: CuratableTour): string => String(tour._id ?? '');

export function curateDestinationTours<T extends CuratableTour>(
  tours: T[],
  bestDealTourIds: string[] = [],
  topTourIds: string[] = []
): { bestDeals: T[]; topTours: T[] } {
  const byId = new Map(tours.map((tour) => [idOf(tour), tour]));
  const curatedBest = bestDealTourIds.map(String).map((id) => byId.get(id)).filter((tour): tour is T => Boolean(tour));
  const bestDeals = (curatedBest.length > 0 ? curatedBest : tours.filter((tour) => tour.isFeatured)).slice(0, 5);
  const bestDealIds = new Set(bestDeals.map(idOf));
  const curatedTop = topTourIds.map(String).map((id) => byId.get(id)).filter((tour): tour is T => Boolean(tour));
  const topSource = curatedTop.length > 0 ? curatedTop : tours;
  const topTours = topSource.filter((tour) => !bestDealIds.has(idOf(tour))).slice(0, 10);

  return { bestDeals, topTours };
}
