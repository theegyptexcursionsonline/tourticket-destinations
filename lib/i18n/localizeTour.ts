type TourLike = Record<string, unknown> & {
  translations?: Record<string, Record<string, unknown>>;
};

const getLocaleBucket = (tour: TourLike, locale: string) => {
  if (!tour?.translations || locale === 'en') return undefined;
  return tour.translations[locale] || tour.translations[locale.toLowerCase()] || tour.translations[locale.split('-')[0]];
};

const getLocalizedString = (tour: TourLike, locale: string, field: string) => {
  if (!tour) return '';
  if (locale === 'en') return (tour[field] as string) || '';

  const bucket = getLocaleBucket(tour, locale);
  const value = bucket?.[field];
  return typeof value === 'string' && value.trim() ? value : ((tour[field] as string) || '');
};

const getLocalizedArray = (tour: TourLike, locale: string, field: string) => {
  if (!tour) return [];
  if (locale === 'en') return (tour[field] as string[]) || [];

  const bucket = getLocaleBucket(tour, locale);
  const value = bucket?.[field];
  return Array.isArray(value) && value.length > 0 ? value : (((tour[field] as string[]) || []));
};

const getLocalizedObjectArray = (
  tour: TourLike,
  locale: string,
  field: 'itinerary' | 'faq' | 'bookingOptions' | 'addOns'
) => {
  const original = Array.isArray(tour[field]) ? (tour[field] as Array<Record<string, unknown>>) : [];
  if (!tour || locale === 'en') return original;

  const bucket = getLocaleBucket(tour, locale);
  const translated = bucket?.[field];
  if (!Array.isArray(translated) || translated.length === 0) {
    return original;
  }

  return original.map((item, index) => {
    const translatedItem = (translated[index] as Record<string, unknown>) || {};
    return {
      ...item,
      ...Object.fromEntries(
        Object.entries(translatedItem).filter(([, value]) => {
          if (typeof value === 'string') return value.trim().length > 0;
          if (Array.isArray(value)) return value.length > 0;
          return value !== undefined && value !== null;
        })
      ),
    };
  });
};

// Matched on url, not position: the gallery can be reordered in the admin
// without the stored translations moving with it.
const getLocalizedImageMetadata = (tour: TourLike, locale: string) => {
  const original = Array.isArray(tour.imageMetadata)
    ? (tour.imageMetadata as Array<Record<string, unknown>>)
    : [];
  if (locale === 'en' || original.length === 0) return original;

  const bucket = getLocaleBucket(tour, locale);
  const translated = bucket?.imageMetadata;
  if (!Array.isArray(translated) || translated.length === 0) return original;

  const byUrl = new Map(
    (translated as Array<Record<string, unknown>>)
      .filter((entry) => entry && typeof entry.url === 'string')
      .map((entry) => [String(entry.url), entry]),
  );

  return original.map((item) => {
    const replacement = byUrl.get(String(item?.url));
    if (!replacement) return item;
    const merged = { ...item };
    for (const field of ['alt', 'title']) {
      const value = replacement[field];
      if (typeof value === 'string' && value.trim()) merged[field] = value;
    }
    return merged;
  });
};

export function localizeTour<T extends TourLike>(tour: T, locale: string): T {
  if (!tour || locale === 'en') return tour;

  const localized = { ...tour } as Record<string, unknown>;

  for (const field of [
    'title',
    'description',
    'longDescription',
    'location',
    'duration',
    'metaTitle',
    'metaDescription',
    'difficulty',
    'physicalRequirements',
    'transportationDetails',
    'mealInfo',
    'weatherPolicy',
    'photoPolicy',
    'tipPolicy',
    'seasonalVariations',
  ]) {
    const value = getLocalizedString(tour, locale, field);
    if (value) localized[field] = value;
  }

  for (const field of [
    'includes',
    'highlights',
    'whatsIncluded',
    'whatsNotIncluded',
    'tags',
    'keywords',
    'whatToBring',
    'whatToWear',
    'notSuitableFor',
    'needToKnow',
    'accessibilityInfo',
    'healthSafety',
    'culturalInfo',
    'localCustoms',
  ]) {
    const value = getLocalizedArray(tour, locale, field);
    if (value.length > 0) localized[field] = value;
  }

  localized.imageMetadata = getLocalizedImageMetadata(tour, locale);

  localized.itinerary = getLocalizedObjectArray(tour, locale, 'itinerary');
  localized.faq = getLocalizedObjectArray(tour, locale, 'faq');
  localized.bookingOptions = getLocalizedObjectArray(tour, locale, 'bookingOptions');
  localized.addOns = getLocalizedObjectArray(tour, locale, 'addOns');

  return localized as T;
}
