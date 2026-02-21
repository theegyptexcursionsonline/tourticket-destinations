/**
 * Internationalization utility helpers
 * Used for accessing locale-aware database fields
 */

export type TranslatableField = string | { [locale: string]: string } | undefined;

/**
 * Get a localized field value from a translatable field.
 * Supports both legacy string format and new { en: "...", ar: "..." } format.
 *
 * @param field - The translatable field (string or locale map)
 * @param locale - The desired locale (defaults to 'en')
 * @returns The localized string value
 */
export function getLocalizedField(
  field: TranslatableField,
  locale: string = 'en'
): string {
  if (!field) return '';
  if (typeof field === 'string') return field; // Legacy format
  return field[locale] || field.en || Object.values(field)[0] || '';
}

/**
 * Get a localized tour field value.
 * Checks the translations subdocument first, falls back to the original field.
 *
 * Usage:
 *   getLocalizedTourField(tour, 'title', 'ar') → tour.translations.ar.title || tour.title
 *
 * @param tour - Tour document (or any object with translations subdoc)
 * @param fieldName - Field name (e.g., 'title', 'description')
 * @param locale - The desired locale
 * @returns The localized string value
 */
export function getLocalizedTourField(
  tour: {
    translations?: { [locale: string]: { [field: string]: string | undefined } };
    [key: string]: any;
  },
  fieldName: string,
  locale: string = 'en'
): string {
  if (!tour) return '';

  // For English, always use the original field
  if (locale === 'en') {
    return tour[fieldName] || '';
  }

  // Check translations subdocument
  const translation = tour.translations?.[locale]?.[fieldName];
  if (translation) return translation;

  // Fall back to original field (English)
  return tour[fieldName] || '';
}

/**
 * Set a localized field value.
 * Converts a string field to an object format if needed.
 */
export function setLocalizedField(
  existingField: TranslatableField,
  locale: string,
  value: string
): { [locale: string]: string } {
  if (!existingField || typeof existingField === 'string') {
    const base: { [locale: string]: string } = {};
    if (typeof existingField === 'string' && existingField) {
      base.en = existingField;
    }
    base[locale] = value;
    return base;
  }
  return { ...existingField, [locale]: value };
}

/**
 * Check if a field has a translation for a given locale.
 */
export function hasTranslation(field: TranslatableField, locale: string): boolean {
  if (!field) return false;
  if (typeof field === 'string') return locale === 'en';
  return !!field[locale];
}

/**
 * Get all available translations for a field.
 */
export function getAvailableTranslations(field: TranslatableField): string[] {
  if (!field) return [];
  if (typeof field === 'string') return ['en'];
  return Object.keys(field).filter(key => !!field[key]);
}
