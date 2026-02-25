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
