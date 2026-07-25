type BookingOptionIdentifierSource = {
  _id?: unknown;
  id?: unknown;
  pricingKey?: unknown;
};

function normalizeIdentifier(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized && normalized !== '[object Object]' ? normalized : null;
}

export function collectTourOptionIds(bookingOptions: unknown): string[] {
  if (!Array.isArray(bookingOptions)) return [];

  const identifiers = bookingOptions.flatMap((option) => {
    if (!option || typeof option !== 'object') return [];
    const source = option as BookingOptionIdentifierSource;
    return [source.pricingKey, source.id, source._id]
      .map(normalizeIdentifier)
      .filter((value): value is string => Boolean(value));
  });

  return Array.from(new Set(identifiers));
}

export function findMatchingTourOptionIds(bookingOptions: unknown, query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return collectTourOptionIds(bookingOptions).filter(
    (identifier) => identifier.toLowerCase() === normalizedQuery,
  );
}

type SearchableTour = {
  _id?: unknown;
  title?: unknown;
  name?: unknown;
  destination?: { name?: unknown } | null;
  category?: { name?: unknown; title?: unknown } | Array<{ name?: unknown; title?: unknown } | null> | null;
  optionIds?: unknown;
};

export function matchesTourAdminSearch(tour: SearchableTour, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const categories = Array.isArray(tour.category)
    ? tour.category
    : tour.category
      ? [tour.category]
      : [];
  const searchableValues = [
    tour.title,
    tour.name,
    tour._id,
    tour.destination?.name,
    ...categories.flatMap((category) => [category?.name, category?.title]),
    ...(Array.isArray(tour.optionIds) ? tour.optionIds : []),
  ];

  return searchableValues.some(
    (value) => value !== null
      && value !== undefined
      && String(value).toLowerCase().includes(normalizedQuery),
  );
}
