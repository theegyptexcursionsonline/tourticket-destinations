// lib/translation/getLocalizedField.ts
// Utility to extract localized content from a tour document

type TourLike = Record<string, unknown> & {
  translations?: Record<string, Record<string, unknown>>;
};

/**
 * Get a localized text field from a tour document.
 * Falls back to the original English field if no translation exists.
 *
 * @example
 * getLocalizedField(tour, 'title', 'ar') // Returns Arabic title or English fallback
 * getLocalizedField(tour, 'description', 'de') // Returns German description or English fallback
 */
export function getLocalizedField(
  doc: TourLike,
  field: string,
  locale: string
): string {
  if (!doc) return '';
  if (locale === 'en') return (doc[field] as string) || '';

  // Check translations first
  const translated = doc.translations?.[locale]?.fields;
  if (translated && typeof translated === 'object') {
    const value = (translated as Record<string, unknown>)[field];
    if (typeof value === 'string' && value.trim()) return value;
  }

  // Direct locale check (for flat translation structure)
  const directTranslation = doc.translations?.[locale]?.[field];
  if (typeof directTranslation === 'string' && directTranslation.trim()) {
    return directTranslation;
  }

  // Fallback to English
  return (doc[field] as string) || '';
}

/**
 * Get a localized array field from a tour document.
 *
 * @example
 * getLocalizedArray(tour, 'highlights', 'ar') // Returns Arabic highlights or English fallback
 */
export function getLocalizedArray(
  doc: TourLike,
  field: string,
  locale: string
): string[] {
  if (!doc) return [];
  if (locale === 'en') return (doc[field] as string[]) || [];

  // Check translations
  const translated = doc.translations?.[locale]?.arrays;
  if (translated && typeof translated === 'object') {
    const value = (translated as Record<string, unknown>)[field];
    if (Array.isArray(value) && value.length > 0) return value;
  }

  // Fallback to English
  return (doc[field] as string[]) || [];
}

/**
 * Get localized itinerary items from a tour document.
 */
export function getLocalizedItinerary(
  doc: TourLike,
  locale: string
): Array<Record<string, unknown>> {
  const original = (doc.itinerary as Array<Record<string, unknown>>) || [];
  if (!doc || locale === 'en') return original;

  const translated = doc.translations?.[locale]?.itinerary;
  if (Array.isArray(translated) && translated.length > 0) {
    // Merge translated text with original non-text fields (time, day, icon, duration)
    return original.map((item, i) => {
      const t = (translated[i] as Record<string, unknown>) || {};
      return {
        ...item,
        title: (t.title as string) || item.title,
        description: (t.description as string) || item.description,
        location: (t.location as string) || item.location,
        includes: Array.isArray(t.includes) ? t.includes : item.includes,
      };
    });
  }

  return original;
}

/**
 * Get localized FAQ items from a tour document.
 */
export function getLocalizedFaq(
  doc: TourLike,
  locale: string
): Array<Record<string, unknown>> {
  const original = (doc.faq as Array<Record<string, unknown>>) || [];
  if (!doc || locale === 'en') return original;

  const translated = doc.translations?.[locale]?.faq;
  if (Array.isArray(translated) && translated.length > 0) {
    return original.map((item, i) => {
      const t = (translated[i] as Record<string, unknown>) || {};
      return {
        ...item,
        question: (t.question as string) || item.question,
        answer: (t.answer as string) || item.answer,
      };
    });
  }

  return original;
}

/**
 * Get localized booking options from a tour document.
 */
export function getLocalizedBookingOptions(
  doc: TourLike,
  locale: string
): Array<Record<string, unknown>> {
  const original = (doc.bookingOptions as Array<Record<string, unknown>>) || [];
  if (!doc || locale === 'en') return original;

  const translated = doc.translations?.[locale]?.bookingOptions;
  if (Array.isArray(translated) && translated.length > 0) {
    return original.map((item, i) => {
      const t = (translated[i] as Record<string, unknown>) || {};
      return {
        ...item,
        label: (t.label as string) || item.label,
        description: (t.description as string) || item.description,
        badge: (t.badge as string) || item.badge,
      };
    });
  }

  return original;
}

/**
 * Get localized add-ons from a tour document.
 */
export function getLocalizedAddOns(
  doc: TourLike,
  locale: string
): Array<Record<string, unknown>> {
  const original = (doc.addOns as Array<Record<string, unknown>>) || [];
  if (!doc || locale === 'en') return original;

  const translated = doc.translations?.[locale]?.addOns;
  if (Array.isArray(translated) && translated.length > 0) {
    return original.map((item, i) => {
      const t = (translated[i] as Record<string, unknown>) || {};
      return {
        ...item,
        name: (t.name as string) || item.name,
        description: (t.description as string) || item.description,
      };
    });
  }

  return original;
}

/**
 * Apply all translations to a tour object, returning a new object with localized content.
 * This is the main utility - call it once in the server component before passing to client.
 */
export function localizeTour<T extends TourLike>(tour: T, locale: string): T {
  if (!tour || locale === 'en') return tour;

  const localized = { ...tour };

  // Localize simple text fields
  const textFields = [
    'title', 'description', 'longDescription', 'meetingPoint',
    'cancellationPolicy', 'metaTitle', 'metaDescription',
    'physicalRequirements', 'transportationDetails', 'mealInfo',
    'weatherPolicy', 'photoPolicy', 'tipPolicy', 'seasonalVariations',
  ];
  for (const field of textFields) {
    const value = getLocalizedField(tour, field, locale);
    if (value) (localized as Record<string, unknown>)[field] = value;
  }

  // Localize array fields
  const arrayFields = [
    'includes', 'highlights', 'whatsIncluded', 'whatsNotIncluded',
    'whatToBring', 'whatToWear', 'healthSafety', 'culturalInfo',
    'localCustoms', 'accessibilityInfo',
  ];
  for (const field of arrayFields) {
    const value = getLocalizedArray(tour, field, locale);
    if (value.length > 0) (localized as Record<string, unknown>)[field] = value;
  }

  // Localize nested structures
  (localized as Record<string, unknown>).itinerary = getLocalizedItinerary(tour, locale);
  (localized as Record<string, unknown>).faq = getLocalizedFaq(tour, locale);
  (localized as Record<string, unknown>).bookingOptions = getLocalizedBookingOptions(tour, locale);
  (localized as Record<string, unknown>).addOns = getLocalizedAddOns(tour, locale);

  return localized;
}
