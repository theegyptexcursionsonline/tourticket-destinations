type SearchableTour = {
  _id?: string;
  slug: string;
  title: string;
  image?: string;
  images?: string[];
  primaryImage?: string;
  location?: string;
  duration?: string;
  rating?: number;
  reviews?: number;
  reviewCount?: number;
  discountPrice?: number;
  originalPrice?: number;
  price?: number;
  description?: string;
  tags?: string[];
  isFeatured?: boolean;
};

type SearchableDestination = {
  _id?: string;
  slug: string;
  name: string;
  image?: string;
  description?: string;
  country?: string;
  tourCount?: number;
  isFeatured?: boolean;
};

type SearchableCategory = {
  _id?: string;
  slug: string;
  name: string;
  description?: string;
  tourCount?: number;
};

type SearchableBlog = {
  _id?: string;
  slug: string;
  title: string;
  category?: string;
  excerpt?: string;
  readTime?: number;
};

type TenantSiteSearchInput = {
  query: string;
  tours?: SearchableTour[];
  destinations?: SearchableDestination[];
  categories?: SearchableCategory[];
  blogs?: SearchableBlog[];
};

export type TenantSiteSearchResults = {
  tours: SearchableTour[];
  destinations: SearchableDestination[];
  categories: SearchableCategory[];
  blogs: SearchableBlog[];
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, ' ')
    .trim();

const scoreMatch = (query: string, fields: Array<string | string[] | undefined>): number => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return 0;
  }

  const queryTerms = normalizedQuery
    .split(/\s+/)
    .filter((term) => term.length > 2);
  let bestScore = 0;

  for (const field of fields) {
    const values = Array.isArray(field) ? field : [field];
    for (const value of values) {
      if (!value) {
        continue;
      }

      const normalizedValue = normalize(value);
      if (!normalizedValue) {
        continue;
      }

      let score = 0;

      if (normalizedValue === normalizedQuery) {
        score = 120;
      } else if (normalizedValue.startsWith(normalizedQuery)) {
        score = 100;
      } else if (normalizedValue.includes(normalizedQuery)) {
        score = 80;
      }

      const matchedTerms = queryTerms.filter((term) => normalizedValue.includes(term)).length;
      if (matchedTerms > 0) {
        score = Math.max(score, matchedTerms * 24);
      }

      bestScore = Math.max(bestScore, score);
    }
  }

  return bestScore;
};

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

function rankItems<T>(
  items: T[],
  query: string,
  fieldsFor: (item: T) => Array<string | string[] | undefined>,
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

export function getTenantSiteSearchResults({
  query,
  tours = [],
  destinations = [],
  categories = [],
  blogs = [],
}: TenantSiteSearchInput): TenantSiteSearchResults {
  return {
    tours: rankItems(
      uniqueBy(tours, (tour) => tour.slug || tour._id),
      query,
      (tour) => [tour.title, tour.description, tour.location, tour.duration, tour.tags],
      5
    ),
    destinations: rankItems(
      uniqueBy(
        destinations.filter((destination) => (Number(destination.tourCount) || 0) > 0),
        (destination) => destination.slug || destination._id
      ),
      query,
      (destination) => [destination.name, destination.description, destination.country],
      5
    ),
    categories: rankItems(
      uniqueBy(
        categories.filter((category) => (Number(category.tourCount) || 0) > 0),
        (category) => category.slug || category._id
      ),
      query,
      (category) => [category.name, category.description, category.slug],
      5
    ),
    blogs: rankItems(
      uniqueBy(blogs, (blog) => blog.slug || blog._id),
      query,
      (blog) => [blog.title, blog.category, blog.excerpt],
      5
    ),
  };
}

export function getTenantFeaturedTours(tours: SearchableTour[], limit = 3): SearchableTour[] {
  const featured = tours.filter((tour) => tour.isFeatured);
  const pool = featured.length > 0 ? featured : tours;

  return pool.slice(0, limit);
}

export function findTenantToursByTitles(
  titles: string[],
  tours: SearchableTour[],
  limit = 4
): SearchableTour[] {
  const matches = titles.flatMap((title) =>
    getTenantSiteSearchResults({ query: title, tours }).tours.slice(0, 1)
  );

  return uniqueBy(matches, (tour) => tour.slug || tour._id).slice(0, limit);
}

export function findTenantDestinationsByNames(
  names: string[],
  destinations: SearchableDestination[],
  limit = 4
): SearchableDestination[] {
  const matches = names.flatMap((name) =>
    getTenantSiteSearchResults({ query: name, destinations }).destinations.slice(0, 1)
  );

  return uniqueBy(matches, (destination) => destination.slug || destination._id).slice(0, limit);
}
