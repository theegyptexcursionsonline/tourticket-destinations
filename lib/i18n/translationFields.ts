import { locales, isRTL } from '@/i18n/config';

export type TranslationFieldType = 'input' | 'textarea' | 'array';

export interface TranslationFieldDef {
  key: string;
  label: string;
  type: TranslationFieldType;
  maxLength?: number;
  rows?: number;
}

/** Locales that need translations (everything except 'en' which is the source) */
export const translatableLocales = locales.filter((l) => l !== 'en');

/** Human-readable locale names */
export const localeNames: Record<string, string> = {
  ar: 'Arabic',
  es: 'Spanish',
  fr: 'French',
  ru: 'Russian',
  de: 'German',
};

export { isRTL };

// ── Tour translatable fields ──

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
];

// ── Destination translatable fields ──

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
  { key: 'localCustoms', label: 'Local Customs', type: 'array', maxLength: 500 },
];

// ── Category translatable fields ──

export const categoryTranslationFields: TranslationFieldDef[] = [
  { key: 'name', label: 'Name', type: 'input', maxLength: 100 },
  { key: 'description', label: 'Description', type: 'textarea', maxLength: 500, rows: 3 },
  { key: 'longDescription', label: 'Long Description', type: 'textarea', maxLength: 2000, rows: 5 },
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
