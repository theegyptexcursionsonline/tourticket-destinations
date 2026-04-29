import { localizeTour } from '@/lib/translation/getLocalizedField';

type TourCollectionItem = {
  _id?: unknown;
  slug?: string | null;
  title?: string;
  description?: string;
  longDescription?: string;
  duration?: string;
  image?: string | null;
  isFeatured?: boolean | null;
  bookings?: number | null;
  rating?: number | null;
  translations?: Record<string, Record<string, unknown>>;
};

const ENGLISH_FOREIGN_HINTS =
  /\b(tagesausflug|stunden|pyramiden|wüsten|ausritt|moschee|kairo|strand|entspannendes|mit massage|tour der)\b/i;

function getLocaleKeys(locale: string): string[] {
  const normalized = locale.toLowerCase();
  return normalized === 'en' ? [normalized, locale] : [normalized, locale, 'en'];
}

function hasLocaleContent(tour: TourCollectionItem, locale: string): boolean {
  const translations = tour.translations;
  if (!translations || typeof translations !== 'object') return false;

  for (const key of getLocaleKeys(locale)) {
    const bucket = (translations as Record<string, unknown>)[key];
    if (!bucket || typeof bucket !== 'object') continue;

    const record = bucket as Record<string, unknown>;
    const fields = record.fields;
    if (fields && typeof fields === 'object') {
      const fieldRecord = fields as Record<string, unknown>;
      if (
        typeof fieldRecord.title === 'string' ||
        typeof fieldRecord.description === 'string' ||
        typeof fieldRecord.duration === 'string'
      ) {
        return true;
      }
    }

    if (
      typeof record.title === 'string' ||
      typeof record.description === 'string' ||
      typeof record.duration === 'string'
    ) {
      return true;
    }
  }

  return false;
}

function getScore(
  original: TourCollectionItem,
  localized: TourCollectionItem,
  locale: string,
  index: number
): number {
  let score = 0;

  if (hasLocaleContent(original, locale)) score += 60;
  if (original.isFeatured) score += 20;
  if (original.image) score += 12;
  if (original.description || original.longDescription) score += 8;
  score += Math.min(Number(original.bookings) || 0, 500) / 25;
  score += Number(original.rating) || 0;

  if (locale.toLowerCase() === 'en') {
    const preview = `${localized.title || ''} ${localized.duration || ''}`;
    score += ENGLISH_FOREIGN_HINTS.test(preview) ? -35 : 20;
  }

  // Stable tie-breaker that keeps earlier query order preferred.
  return score - index / 1000;
}

function getKey(tour: TourCollectionItem, fallbackIndex: number): string {
  const slug = typeof tour.slug === 'string' ? tour.slug.trim().toLowerCase() : '';
  if (slug) return `slug:${slug}`;

  const id = tour._id == null ? '' : String(tour._id);
  if (id) return `id:${id}`;

  return `index:${fallbackIndex}`;
}

export function selectLocalizedTourCandidate<T extends TourCollectionItem>(
  tours: T[],
  locale: string
): T | null {
  if (!tours.length) return null;

  let bestTour: T | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  tours.forEach((tour, index) => {
    const localized = localizeTour(tour as any, locale) as T;
    const score = getScore(tour, localized, locale, index);
    if (score > bestScore) {
      bestTour = localized;
      bestScore = score;
    }
  });

  return bestTour;
}

export function localizeAndDedupeTours<T extends TourCollectionItem>(
  tours: T[],
  locale: string
): T[] {
  const bestByKey = new Map<
    string,
    { tour: T; score: number; order: number }
  >();

  tours.forEach((tour, index) => {
    const localized = localizeTour(tour as any, locale) as T;

    // English pages should not render untranslated German tenant copies. If a
    // record has no English translation and the visible fields still look
    // German, leave it out instead of showing mixed-language cards.
    if (locale.toLowerCase() === 'en') {
      const preview = `${localized.title || ''} ${localized.duration || ''}`;
      if (!hasLocaleContent(tour, 'en') && ENGLISH_FOREIGN_HINTS.test(preview)) {
        return;
      }
    }

    const key = getKey(localized, index);
    const score = getScore(tour, localized, locale, index);
    const existing = bestByKey.get(key);

    if (!existing) {
      bestByKey.set(key, { tour: localized, score, order: index });
      return;
    }

    if (score > existing.score) {
      bestByKey.set(key, { tour: localized, score, order: existing.order });
    }
  });

  return Array.from(bestByKey.values())
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.tour);
}
