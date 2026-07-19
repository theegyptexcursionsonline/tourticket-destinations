export type SearchRankableTour = {
  title?: unknown;
  location?: unknown;
  tags?: unknown;
  destination?: unknown;
  rating?: unknown;
  bookings?: unknown;
};

const normalize = (value: unknown): string =>
  typeof value === 'string'
    ? value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
    : '';

const destinationName = (destination: unknown): string => {
  if (typeof destination === 'string') return destination;
  if (destination && typeof destination === 'object' && 'name' in destination) {
    return String((destination as { name?: unknown }).name || '');
  }
  return '';
};

const popularity = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const relevanceScore = (tour: SearchRankableTour, query: string): number => {
  const normalizedQuery = normalize(query);
  const keywords = normalizedQuery.split(' ').filter(word => word.length > 1);
  const title = normalize(tour.title);
  const tags = normalize(Array.isArray(tour.tags) ? tour.tags.join(' ') : tour.tags);
  const location = normalize(tour.location);
  const destination = normalize(destinationName(tour.destination));

  if (!normalizedQuery || keywords.length === 0) return 0;

  let score = 0;
  if (title === normalizedQuery) score += 240;
  else if (title.startsWith(normalizedQuery)) score += 180;
  else if (title.includes(normalizedQuery)) score += 140;

  if (tags.includes(normalizedQuery)) score += 90;
  if (keywords.every(keyword => title.includes(keyword))) score += 80;

  for (const keyword of keywords) {
    if (title.includes(keyword)) score += 18;
    if (tags.includes(keyword)) score += 10;
    if (location.includes(keyword)) score += 5;
    if (destination.includes(keyword)) score += 4;
  }

  return score;
};

export function rankLiveSearchResults<T extends SearchRankableTour>(tours: T[], query: string): T[] {
  return tours
    .map((tour, index) => ({ tour, index, score: relevanceScore(tour, query) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ratingDelta = popularity(b.tour.rating) - popularity(a.tour.rating);
      if (ratingDelta !== 0) return ratingDelta;
      const bookingDelta = popularity(b.tour.bookings) - popularity(a.tour.bookings);
      return bookingDelta !== 0 ? bookingDelta : a.index - b.index;
    })
    .map(({ tour }) => tour);
}
