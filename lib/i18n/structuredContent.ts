import type { StructuredTranslationSpec } from './translationFields';

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Pull the customer-readable text out of repeated sub-documents (FAQs, travel
 * tips). Non-text keys are dropped so the translator never sees or rewrites ids.
 */
export function extractStructuredSpecContent(
  doc: Record<string, unknown>,
  specs: StructuredTranslationSpec[]
): Record<string, Array<Record<string, string>>> {
  const out: Record<string, Array<Record<string, string>>> = {};

  for (const spec of specs) {
    const source = doc[spec.key];
    if (!Array.isArray(source) || source.length === 0) continue;

    const entries = source.map((item) => {
      const record = (item || {}) as Record<string, unknown>;
      const entry: Record<string, string> = {};
      for (const field of spec.fields) {
        if (hasText(record[field])) entry[field] = record[field] as string;
      }
      return entry;
    });

    if (entries.some((entry) => Object.keys(entry).length > 0)) out[spec.key] = entries;
  }

  return out;
}

