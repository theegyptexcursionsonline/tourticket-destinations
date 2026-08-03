import {
  attractionPageStructuredFields,
  attractionPageTranslationFields,
  categoryStructuredFields,
  categoryTranslationFields,
  destinationStructuredFields,
  destinationTranslationFields,
  tourTranslationFields,
  type StructuredTranslationSpec,
  type TranslationFieldDef,
} from './translationFields';

export type TranslationModelType = 'tour' | 'destination' | 'category' | 'attraction-page';

/**
 * Auto Translate posts the content currently on screen, because the streaming
 * route otherwise reloads the saved document and translates whatever was there
 * before this edit — image alt/title typed in the form but not yet saved came
 * back empty while the UI still reported every locale as successful.
 *
 * The draft is untrusted input. It may only ever carry translatable content:
 * the flat translation fields and the structured blocks the translator already
 * reads. It can never carry an id, a tenant, or anything the route authorizes
 * on, and it is never persisted — saving the form stays authoritative.
 */
export const SOURCE_DRAFT_MAX_INPUT_CHARS = 1_000_000;
export const SOURCE_DRAFT_MAX_CHARS = 200_000;

const MAX_BLOCK_ITEMS = 250;
const MAX_ARRAY_ITEMS = 250;
const MAX_STRING_CHARS = 20_000;

/**
 * Never accept these even if a future field definition is named after one —
 * scope, identity, and stored translations are resolved from the database.
 */
const RESERVED_DRAFT_KEYS = new Set([
  '_id',
  'id',
  '__proto__',
  'constructor',
  'prototype',
  'tenantId',
  'tenant',
  'translations',
  'slug',
  'role',
  'permissions',
]);

interface DraftBlockSpec {
  /** Key the translator reads on the document. */
  key: string;
  /** Form-state keys that feed `key` (TourForm keeps `faqs`, the tour document keeps `faq`). */
  sourceKeys?: string[];
  textFields: string[];
  listFields?: string[];
  /** Identifier copied through untranslated, e.g. the image url. */
  matchKey?: string;
}

const blockFromSpec = (spec: StructuredTranslationSpec): DraftBlockSpec => ({
  key: spec.key,
  textFields: spec.fields,
  matchKey: spec.matchKey,
});

// Mirrors extractStructuredTourContent(): the tour document keeps its blocks
// inline rather than through a StructuredTranslationSpec list.
const tourDraftBlocks: DraftBlockSpec[] = [
  { key: 'itinerary', textFields: ['title', 'description', 'location'], listFields: ['includes'] },
  { key: 'faq', sourceKeys: ['faq', 'faqs'], textFields: ['question', 'answer'] },
  { key: 'bookingOptions', textFields: ['label', 'description', 'badge'] },
  { key: 'addOns', textFields: ['name', 'description'] },
  { key: 'imageMetadata', textFields: ['alt', 'title'], matchKey: 'url' },
];

interface DraftConfig {
  fieldDefs: TranslationFieldDef[];
  blocks: DraftBlockSpec[];
  /** Flat fields the definitions reach one level down, e.g. averageTemperature.summer. */
  nested: Record<string, string[]>;
}

const DRAFT_CONFIG: Record<TranslationModelType, DraftConfig> = {
  tour: {
    fieldDefs: tourTranslationFields,
    blocks: tourDraftBlocks,
    nested: {},
  },
  destination: {
    fieldDefs: destinationTranslationFields,
    blocks: destinationStructuredFields.map(blockFromSpec),
    nested: { averageTemperature: ['summer', 'winter'] },
  },
  category: {
    fieldDefs: categoryTranslationFields,
    blocks: categoryStructuredFields.map(blockFromSpec),
    nested: {},
  },
  'attraction-page': {
    fieldDefs: attractionPageTranslationFields,
    blocks: attractionPageStructuredFields.map(blockFromSpec),
    nested: {},
  },
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const asText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_STRING_CHARS) : undefined;
};

const asTextList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .slice(0, MAX_ARRAY_ITEMS)
    .map(asText)
    .filter((item): item is string => Boolean(item));
  return items.length > 0 ? items : undefined;
};

const sanitizeBlock = (
  raw: unknown,
  block: DraftBlockSpec,
): Array<Record<string, string | string[]>> | undefined => {
  if (!Array.isArray(raw)) return undefined;

  const entries = raw.slice(0, MAX_BLOCK_ITEMS).map((item) => {
    const entry: Record<string, string | string[]> = {};
    if (!isPlainObject(item)) return entry;

    if (block.matchKey) {
      const identifier = asText(item[block.matchKey]);
      if (identifier) entry[block.matchKey] = identifier;
    }
    for (const field of block.textFields) {
      const value = asText(item[field]);
      if (value) entry[field] = value;
    }
    for (const field of block.listFields || []) {
      const value = asTextList(item[field]);
      if (value) entry[field] = value;
    }
    return entry;
  });

  // A block that carries nothing but identifiers has no content to translate,
  // so leave the saved document in charge rather than blanking its source.
  const hasContent = entries.some((entry) =>
    Object.keys(entry).some((key) => key !== block.matchKey),
  );
  return hasContent ? entries : undefined;
};

export type SourceDraftResult =
  | { ok: true; draft: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Reduce an edit form's state to the translatable content the streaming route
 * is allowed to read. Runs on the client before posting and again on the
 * server before use — malformed or oversized input fails closed instead of
 * quietly translating stale saved values.
 */
export function sanitizeSourceDraft(
  modelType: TranslationModelType,
  raw: unknown,
): SourceDraftResult {
  const config = DRAFT_CONFIG[modelType];
  if (!config) return { ok: false, error: 'Unsupported model type for draft content' };
  if (raw === undefined || raw === null) return { ok: true, draft: {} };
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Draft content must be a plain JSON object' };
  }

  let inputSize: number;
  try {
    inputSize = JSON.stringify(raw)?.length ?? 0;
  } catch {
    return { ok: false, error: 'Draft content could not be read' };
  }
  if (inputSize > SOURCE_DRAFT_MAX_INPUT_CHARS) {
    return { ok: false, error: 'Draft content is too large to auto-translate. Save first, then retry.' };
  }

  const draft: Record<string, unknown> = {};

  for (const def of config.fieldDefs) {
    if (RESERVED_DRAFT_KEYS.has(def.key)) continue;
    const value = def.type === 'array' ? asTextList(raw[def.key]) : asText(raw[def.key]);
    if (value !== undefined) draft[def.key] = value;
  }

  for (const [key, subKeys] of Object.entries(config.nested)) {
    if (RESERVED_DRAFT_KEYS.has(key)) continue;
    const source = raw[key];
    if (!isPlainObject(source)) continue;
    const nested: Record<string, string> = {};
    for (const subKey of subKeys) {
      const value = asText(source[subKey]);
      if (value) nested[subKey] = value;
    }
    if (Object.keys(nested).length > 0) draft[key] = nested;
  }

  for (const block of config.blocks) {
    if (RESERVED_DRAFT_KEYS.has(block.key)) continue;
    const sourceKeys = block.sourceKeys || [block.key];
    for (const sourceKey of sourceKeys) {
      const entries = sanitizeBlock(raw[sourceKey], block);
      if (entries) {
        draft[block.key] = entries;
        break;
      }
    }
  }

  const size = JSON.stringify(draft)?.length ?? 0;
  if (size > SOURCE_DRAFT_MAX_CHARS) {
    return { ok: false, error: 'Draft content is too large to auto-translate. Save first, then retry.' };
  }

  return { ok: true, draft };
}

/**
 * Overlay the sanitized draft on the saved document for translation only. Keys
 * absent from the draft keep their saved value, so an un-hydrated form falls
 * back to the database instead of translating a blank page.
 */
export function applySourceDraft(
  doc: Record<string, unknown>,
  draft: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!draft || Object.keys(draft).length === 0) return doc;
  return { ...doc, ...draft };
}
