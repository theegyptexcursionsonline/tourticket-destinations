import type { TranslationFieldDef } from './translationFields';

type TranslationValue = string | string[];

const truncateAtWordBoundary = (value: string, maxLength: number): string => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const slice = trimmed.slice(0, maxLength).trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  return lastSpace >= Math.floor(maxLength * 0.7)
    ? slice.slice(0, lastSpace).trimEnd()
    : slice;
};

export function buildTranslationLengthInstruction(fieldDefs: TranslationFieldDef[]): string {
  const limits = fieldDefs
    .filter((field) => typeof field.maxLength === 'number')
    .map((field) => `${field.key}: ${field.maxLength} characters`)
    .join(', ');

  return limits ? `- Never exceed these field limits (including spaces): ${limits}` : '';
}

export function enforceTranslationFieldLimits(
  translated: Record<string, unknown>,
  fieldDefs: TranslationFieldDef[]
): Record<string, TranslationValue> {
  const definitions = new Map(fieldDefs.map((field) => [field.key, field]));
  const normalized: Record<string, TranslationValue> = {};

  for (const [key, value] of Object.entries(translated)) {
    const definition = definitions.get(key);
    if (!definition) continue;

    const maxLength = definition.maxLength;
    if (typeof value === 'string') {
      const normalizedValue = typeof maxLength === 'number'
        ? truncateAtWordBoundary(value, maxLength)
        : value.trim();
      if (normalizedValue) normalized[key] = normalizedValue;
      continue;
    }

    if (Array.isArray(value)) {
      const items = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => typeof maxLength === 'number'
          ? truncateAtWordBoundary(item, maxLength)
          : item.trim())
        .filter(Boolean);
      if (items.length > 0) normalized[key] = items;
    }
  }

  return normalized;
}
