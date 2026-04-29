import { Category, Destination, Tour } from '@/types';

type SearchableTour = Pick<
  Tour,
  | '_id'
  | 'slug'
  | 'title'
  | 'image'
  | 'images'
  | 'duration'
  | 'rating'
  | 'reviews'
  | 'discountPrice'
  | 'originalPrice'
  | 'price'
  | 'description'
  | 'destination'
  | 'category'
> & {
  location?: string;
  isFeatured?: boolean;
};

type SearchableDestination = Pick<
  Destination,
  '_id' | 'slug' | 'name' | 'description' | 'country' | 'tourCount'
> & {
  image?: string;
  featured?: boolean;
};

type SearchableCategory = Pick<
  Category,
  '_id' | 'slug' | 'name' | 'description' | 'tourCount'
>;

type DestinationPageSearchInput = {
  query: string;
  destination: SearchableDestination;
  destinationTours: SearchableTour[];
  relatedDestinations?: SearchableDestination[];
  allCategories?: SearchableCategory[];
};

type SearchResults = {
  tours: SearchableTour[];
  destinations: SearchableDestination[];
  categories: SearchableCategory[];
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, ' ')
    .trim();

const uniqueBy = <T>(items: T[], getKey: (item: T) => string | undefined): T[] => {
  const seen = new Set<string>();
  const results: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push(item);
  }

  return results;
};

const readStrings = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(readStrings);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [record.name, record.title, record.slug, record.description].flatMap(readStrings);
  }

  return [];
};

const readEntityKeys = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    return [normalize(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap(readEntityKeys);
  }

  const record = value as Record<string, unknown>;
  return [record._id, record.id, record.slug, record.name].flatMap(readEntityKeys);
};

const scoreMatch = (query: string, fields: unknown[]): number => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return 0;
  }

  const queryTerms = normalizedQuery
    .split(/\s+/)
    .filter((term) => term.length > 2);
  let bestScore = 0;

  for (const field of fields) {
    for (const rawValue of readStrings(field)) {
      const value = normalize(rawValue);
      if (!value) {
        continue;
      }

      let score = 0;

      if (value === normalizedQuery) {
        score = 120;
      } else if (value.startsWith(normalizedQuery)) {
        score = 100;
      } else if (value.includes(normalizedQuery)) {
        score = 80;
      }

      const matchedTerms = queryTerms.filter((term) => value.includes(term)).length;
      if (matchedTerms > 0) {
        score = Math.max(score, matchedTerms * 24);
      }

      bestScore = Math.max(bestScore, score);
    }
  }

  return bestScore;
};

export function getDestinationCategories(
  destinationTours: SearchableTour[],
  allCategories: SearchableCategory[] = []
): SearchableCategory[] {
  if (allCategories.length === 0) {
    return [];
  }

  const categoryKeys = new Set(
    destinationTours.flatMap((tour) => readEntityKeys(tour.category))
  );

  const matchedCategories = allCategories.filter((category) =>
    readEntityKeys(category).some((key) => categoryKeys.has(key))
  );

  if (matchedCategories.length > 0) {
    return matchedCategories;
  }

  return allCategories;
}

function rankItems<T>(
  items: T[],
  query: string,
  fieldsFor: (item: T) => unknown[],
  limit: number
): T[] {
  return items
    .map((item) => ({
      item,
      score: scoreMatch(query, fieldsFor(item)),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function getDestinationPageSearchResults({
  query,
  destination,
  destinationTours,
  relatedDestinations = [],
  allCategories = [],
}: DestinationPageSearchInput): SearchResults {
  const relevantCategories = getDestinationCategories(destinationTours, allCategories);
  const relevantDestinations = uniqueBy(
    [destination, ...relatedDestinations],
    (item) => item.slug || item._id
  );

  return {
    tours: rankItems(
      destinationTours,
      query,
      (tour) => [
        tour.title,
        tour.description,
        tour.location,
        tour.duration,
        tour.destination,
        tour.category,
      ],
      5
    ),
    destinations: rankItems(
      relevantDestinations,
      query,
      (item) => [item.name, item.description, item.country],
      3
    ),
    categories: rankItems(
      relevantCategories,
      query,
      (item) => [item.name, item.description, item.slug],
      3
    ),
  };
}

export function getDestinationTrendingSearches({
  destination,
  destinationTours,
  allCategories = [],
}: Omit<DestinationPageSearchInput, 'query' | 'relatedDestinations'>): string[] {
  const relevantCategories = getDestinationCategories(destinationTours, allCategories);

  return uniqueBy(
    [
      destination.name,
      ...relevantCategories.map((category) => category.name),
      ...destinationTours.map((tour) => tour.title),
    ].filter(Boolean),
    (value) => normalize(value)
  ).slice(0, 6);
}
