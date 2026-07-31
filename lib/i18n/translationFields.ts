import { locales, isRTL } from '@/i18n/config';

export type TranslationFieldType = 'input' | 'textarea' | 'array';

export interface TranslationFieldDef {
  key: string;
  label: string;
  type: TranslationFieldType;
  maxLength?: number;
  rows?: number;
  /**
   * When the English source is empty, the translator is allowed to write this
   * field from context (useful for SEO copy). Never set it on operational or
   * policy content: an invented Arabic cancellation policy is worse than none.
   */
  neverGenerate?: boolean;
}

/** Locales that need translations (everything except 'en' which is the source) */
export const translatableLocales = locales.filter((l) => l !== 'en');

/** Human-readable locale names */
export const localeNames: Record<string, string> = {
  ar: 'Arabic',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ru: 'Russian',
};

export { isRTL };

// ── Destination translatable fields (matches DestinationTranslationSchema) ──

export const destinationTranslationFields: TranslationFieldDef[] = [
  { key: 'name', label: 'Name', type: 'input', maxLength: 100 },
  { key: 'country', label: 'Country', type: 'input', maxLength: 100 },
  { key: 'description', label: 'Description', type: 'textarea', maxLength: 500, rows: 3 },
  { key: 'longDescription', label: 'Long Description', type: 'textarea', maxLength: 2000, rows: 5 },
  { key: 'bestTimeToVisit', label: 'Best Time to Visit', type: 'input', maxLength: 200 },
  { key: 'currency', label: 'Currency', type: 'input', maxLength: 10 },
  { key: 'timezone', label: 'Timezone', type: 'input', maxLength: 100 },
  { key: 'climate', label: 'Climate', type: 'textarea', maxLength: 500, rows: 3 },
  { key: 'visaRequirements', label: 'Visa Requirements', type: 'textarea', maxLength: 1000, rows: 3 },
  { key: 'metaTitle', label: 'Meta Title', type: 'input', maxLength: 60 },
  { key: 'metaDescription', label: 'Meta Description', type: 'textarea', maxLength: 160, rows: 2 },
  { key: 'languagesSpoken', label: 'Languages Spoken', type: 'array', maxLength: 50 },
  { key: 'highlights', label: 'Highlights', type: 'array', maxLength: 200 },
  { key: 'thingsToDo', label: 'Things to Do', type: 'array', maxLength: 300 },
  { key: 'localCustoms', label: 'Local Customs', type: 'array', maxLength: 500, neverGenerate: true },
  { key: 'weatherWarnings', label: 'Weather Warnings', type: 'array', maxLength: 300 },
  { key: 'summerTemperature', label: 'Summer Temperature', type: 'input', maxLength: 100, neverGenerate: true },
  { key: 'winterTemperature', label: 'Winter Temperature', type: 'input', maxLength: 100, neverGenerate: true },
];

// ── Tour translatable fields (matches TourTranslationSchema) ──

export const tourTranslationFields: TranslationFieldDef[] = [
  { key: 'title', label: 'Title', type: 'input', maxLength: 200 },
  { key: 'description', label: 'Description', type: 'textarea', maxLength: 1000, rows: 3 },
  { key: 'longDescription', label: 'Long Description', type: 'textarea', maxLength: 5000, rows: 6 },
  { key: 'location', label: 'Location', type: 'input', maxLength: 200 },
  { key: 'duration', label: 'Duration', type: 'input', maxLength: 100 },
  { key: 'metaTitle', label: 'Meta Title', type: 'input', maxLength: 60 },
  { key: 'metaDescription', label: 'Meta Description', type: 'textarea', maxLength: 160, rows: 2 },
  { key: 'includes', label: 'Includes', type: 'array', maxLength: 300 },
  { key: 'highlights', label: 'Highlights', type: 'array', maxLength: 300 },
  { key: 'whatsIncluded', label: "What's Included", type: 'array', maxLength: 300 },
  { key: 'whatsNotIncluded', label: "What's Not Included", type: 'array', maxLength: 300 },
  { key: 'tags', label: 'Tags', type: 'array', maxLength: 50 },
  { key: 'difficulty', label: 'Difficulty', type: 'input', maxLength: 50, neverGenerate: true },
  { key: 'keywords', label: 'Keywords', type: 'array', maxLength: 100, neverGenerate: true },
  { key: 'whatToBring', label: 'What to Bring', type: 'array', maxLength: 300, neverGenerate: true },
  { key: 'whatToWear', label: 'What to Wear', type: 'array', maxLength: 300, neverGenerate: true },
  { key: 'notSuitableFor', label: 'Not Suitable For', type: 'array', maxLength: 300, neverGenerate: true },
  { key: 'needToKnow', label: 'Need to Know', type: 'array', maxLength: 300, neverGenerate: true },
  { key: 'accessibilityInfo', label: 'Accessibility Info', type: 'array', maxLength: 300, neverGenerate: true },
  { key: 'healthSafety', label: 'Health & Safety', type: 'array', maxLength: 300, neverGenerate: true },
  { key: 'culturalInfo', label: 'Cultural Highlights', type: 'array', maxLength: 300, neverGenerate: true },
  { key: 'localCustoms', label: 'Local Customs', type: 'array', maxLength: 300, neverGenerate: true },
  { key: 'physicalRequirements', label: 'Physical Requirements', type: 'textarea', maxLength: 500, rows: 2, neverGenerate: true },
  { key: 'transportationDetails', label: 'Transportation Details', type: 'textarea', maxLength: 500, rows: 2, neverGenerate: true },
  { key: 'mealInfo', label: 'Meal Information', type: 'textarea', maxLength: 500, rows: 2, neverGenerate: true },
  { key: 'weatherPolicy', label: 'Weather Policy', type: 'textarea', maxLength: 500, rows: 2, neverGenerate: true },
  { key: 'photoPolicy', label: 'Photography Policy', type: 'textarea', maxLength: 500, rows: 2, neverGenerate: true },
  { key: 'tipPolicy', label: 'Gratuity Policy', type: 'textarea', maxLength: 500, rows: 2, neverGenerate: true },
  { key: 'seasonalVariations', label: 'Seasonal Variations', type: 'textarea', maxLength: 500, rows: 2, neverGenerate: true },
];

/**
 * Per-image alt text and title. Shared by every model that stores
 * `imageMetadata`, and matched by `url` rather than position because gallery
 * order changes independently of the translations.
 */
export const imageMetadataStructuredField: StructuredTranslationSpec = {
  key: 'imageMetadata',
  fields: ['alt', 'title'],
  matchKey: 'url',
};

// ── Category translatable fields (matches CategoryTranslationSchema) ──

export const categoryTranslationFields: TranslationFieldDef[] = [
  { key: 'name', label: 'Name', type: 'input', maxLength: 100 },
  { key: 'description', label: 'Description', type: 'textarea', maxLength: 500, rows: 3 },
  { key: 'longDescription', label: 'Long Description', type: 'textarea', maxLength: 2000, rows: 5 },
  { key: 'metaTitle', label: 'Meta Title', type: 'input', maxLength: 60 },
  { key: 'metaDescription', label: 'Meta Description', type: 'textarea', maxLength: 160, rows: 2 },
  { key: 'highlights', label: 'Highlights', type: 'array', maxLength: 200 },
  { key: 'features', label: 'Features', type: 'array', maxLength: 300 },
];

// ── Attraction/landing page translatable fields (matches AttractionPageTranslationSchema) ──

export const attractionPageTranslationFields: TranslationFieldDef[] = [
  { key: 'title', label: 'Title', type: 'input', maxLength: 200 },
  { key: 'description', label: 'Description', type: 'textarea', maxLength: 500, rows: 3 },
  { key: 'longDescription', label: 'Long Description', type: 'textarea', maxLength: 2000, rows: 5 },
  { key: 'gridTitle', label: 'Grid Title', type: 'input', maxLength: 200 },
  { key: 'gridSubtitle', label: 'Grid Subtitle', type: 'textarea', maxLength: 500, rows: 2 },
  { key: 'metaTitle', label: 'Meta Title', type: 'input', maxLength: 60 },
  { key: 'metaDescription', label: 'Meta Description', type: 'textarea', maxLength: 160, rows: 2 },
  { key: 'highlights', label: 'Highlights', type: 'array', maxLength: 200 },
  { key: 'features', label: 'Features', type: 'array', maxLength: 300 },
];

// ── Shared helper ──

/** Convert a Map or object from MongoDB into a plain translations object */
export const normalizeTranslations = (
  translations: unknown
): Record<string, Record<string, unknown>> => {
  if (!translations) return {};
  const normalized =
    translations instanceof Map
      ? Object.fromEntries(translations.entries())
      : translations;
  if (typeof normalized !== 'object' || normalized === null) return {};
  try {
    return JSON.parse(JSON.stringify(normalized));
  } catch {
    return {};
  }
};

// ── Repeated sub-document blocks ──
// FAQs and travel tips are arrays of objects, so they can't be edited through
// the flat field editor. Auto-translate still covers them: these specs tell the
// translator which sub-fields carry customer-readable text.

export interface StructuredTranslationSpec {
  key: string;
  fields: string[];
  /** Merge translated entries by this field instead of by array position. */
  matchKey?: string;
}

export const destinationStructuredFields: StructuredTranslationSpec[] = [
  { key: 'faqs', fields: ['question', 'answer'] },
  { key: 'travelTips', fields: ['title', 'content'] },
];

export const attractionPageStructuredFields: StructuredTranslationSpec[] = [
  { key: 'faqs', fields: ['question', 'answer'] },
  { key: 'travelTips', fields: ['title', 'content'] },
];
