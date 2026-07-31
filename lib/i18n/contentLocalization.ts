type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as UnknownRecord;
};

const getLocaleBucket = (
  translations: unknown,
  locale: string,
  fallbackLocale = 'en'
): UnknownRecord | undefined => {
  const record = asRecord(translations);
  if (!record) return undefined;

  const normalized = locale.toLowerCase();
  return (
    asRecord(record[normalized]) ||
    asRecord(record[locale]) ||
    asRecord(record[fallbackLocale]) ||
    undefined
  );
};

const isEmptyString = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length === 0;

export const localizeEntityFields = <T extends UnknownRecord>(
  entity: T,
  locale: string,
  fields: string[],
  fallbackLocale = 'en'
): T => {
  const localized = { ...entity };
  const bucket = getLocaleBucket(entity.translations, locale, fallbackLocale);
  if (!bucket) return localized;

  for (const field of fields) {
    const translatedValue = bucket[field];
    if (
      translatedValue !== undefined &&
      translatedValue !== null &&
      !isEmptyString(translatedValue)
    ) {
      (localized as UnknownRecord)[field] = translatedValue;
    }
  }

  return localized;
};

/**
 * Repeated sub-documents (FAQs, travel tips) live as arrays of objects, so they
 * can't go through localizeEntityFields — a partial translation would drop
 * entries. Merge index-by-index instead and keep the English value for anything
 * the translator left blank.
 */
export interface StructuredEntrySpec {
  key: string;
  fields: string[];
  /**
   * Merge by this identifying field instead of by array position. Image
   * metadata needs it: galleries get reordered without the translations
   * moving with them, and positional merging would then caption the wrong
   * picture.
   */
  matchKey?: string;
}

export const localizeStructuredEntries = <T extends UnknownRecord>(
  entity: T,
  locale: string,
  specs: StructuredEntrySpec[],
  fallbackLocale = 'en'
): T => {
  const bucket = getLocaleBucket(entity.translations, locale, fallbackLocale);
  if (!bucket) return { ...entity };

  const localized = { ...entity } as UnknownRecord;

  for (const spec of specs) {
    const source = entity[spec.key];
    const translated = bucket[spec.key];
    if (!Array.isArray(source) || !Array.isArray(translated)) continue;

    const byKey = spec.matchKey
      ? new Map(
          translated
            .map((entry) => asRecord(entry))
            .filter((entry): entry is UnknownRecord => Boolean(entry && entry[spec.matchKey!]))
            .map((entry) => [String(entry[spec.matchKey!]), entry]),
        )
      : null;

    localized[spec.key] = source.map((item, index) => {
      const original = asRecord(item);
      if (!original) return item;
      const replacement = byKey
        ? byKey.get(String(original[spec.matchKey!])) ?? null
        : asRecord(translated[index]);
      if (!replacement) return item;

      const merged: UnknownRecord = { ...original };
      for (const field of spec.fields) {
        const value = replacement[field];
        if (value !== undefined && value !== null && !isEmptyString(value)) {
          merged[field] = value;
        }
      }
      return merged;
    });
  }

  return localized as T;
};
