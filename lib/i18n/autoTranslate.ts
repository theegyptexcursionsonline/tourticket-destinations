import { getOpenAIClient } from '@/lib/openai';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import {
  TranslationFieldDef,
  translatableLocales,
  localeNames,
  tourTranslationFields,
  destinationTranslationFields,
  categoryTranslationFields,
  attractionPageTranslationFields,
} from './translationFields';

type FieldValues = Record<string, string | string[]>;
type TranslationsMap = Record<string, Record<string, string | string[]>>;
type StructuredTranslationMap = Record<string, unknown>;

interface StructuredItineraryItem {
  title?: string;
  description?: string;
  location?: string;
  includes?: string[];
}

interface StructuredFaqItem {
  question?: string;
  answer?: string;
}

interface StructuredBookingOptionItem {
  label?: string;
  description?: string;
  badge?: string;
}

interface StructuredAddOnItem {
  name?: string;
  description?: string;
}

interface StructuredTourContent {
  itinerary: StructuredItineraryItem[];
  faq: StructuredFaqItem[];
  bookingOptions: StructuredBookingOptionItem[];
  addOns: StructuredAddOnItem[];
}

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Translate a set of English field values into all target locales using OpenAI.
 * Returns a locale-keyed translation map for every configured non-English locale.
 */
export async function translateEntityFields(
  fields: FieldValues,
  fieldDefs: TranslationFieldDef[],
  entityContext: string
): Promise<TranslationsMap> {
  const openai = getOpenAIClient();
  if (!openai) return {};

  // Filter to only fields that have content
  const fieldsToTranslate: FieldValues = {};
  for (const def of fieldDefs) {
    const val = fields[def.key];
    if (!val) continue;
    if (typeof val === 'string' && val.trim().length === 0) continue;
    if (Array.isArray(val) && val.filter(Boolean).length === 0) continue;
    fieldsToTranslate[def.key] = val;
  }

  if (Object.keys(fieldsToTranslate).length === 0) return {};

  const localeList = translatableLocales.map(l => `${l} (${localeNames[l] || l})`).join(', ');

  const responseShape = Object.fromEntries(translatableLocales.map((locale) => [locale, { fieldName: 'translated value' }]));
  const prompt = `You are a professional translator for a tour booking website. Translate the following English ${entityContext} content into these locales: ${localeList}.

Content to translate:
${JSON.stringify(fieldsToTranslate, null, 2)}

Rules:
- Keep proper nouns (city names, brand names) in their commonly known local form (e.g. Cairo → القاهرة in Arabic)
- For Arabic (ar), produce proper RTL text
- Keep translations natural and fluent, not literal word-for-word
- For SEO fields (metaTitle, metaDescription), optimize for the target language
- Array fields must remain arrays with the same number of items, each item translated
- Return ONLY a JSON object with this locale-keyed structure: ${JSON.stringify(responseShape)}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a translation API. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return {};

    const parsed = JSON.parse(text) as TranslationsMap;

    // Validate structure: ensure each locale key exists and is an object
    const validated: TranslationsMap = {};
    for (const locale of translatableLocales) {
      if (parsed[locale] && typeof parsed[locale] === 'object') {
        validated[locale] = parsed[locale];
      }
    }

    return validated;
  } catch (error) {
    console.error(`Auto-translate failed for ${entityContext}:`, error);
    return {};
  }
}

/**
 * Translate English fields into a SINGLE target locale using OpenAI.
 * Returns { field: translatedValue } for the given locale.
 */
export async function translateEntityFieldsForLocale(
  fields: FieldValues,
  fieldDefs: TranslationFieldDef[],
  entityContext: string,
  locale: string
): Promise<Record<string, string | string[]>> {
  const openai = getOpenAIClient();
  if (!openai) {
    // Fail loud: a missing key must surface as an error in the admin UI,
    // not silently produce "successful" empty translations.
    throw new Error('Translation service is not configured (OPENAI_API_KEY missing)');
  }

  const fieldsToTranslate: FieldValues = {};
  for (const def of fieldDefs) {
    const val = fields[def.key];
    if (!val) continue;
    if (typeof val === 'string' && val.trim().length === 0) continue;
    if (Array.isArray(val) && val.filter(Boolean).length === 0) continue;
    fieldsToTranslate[def.key] = val;
  }

  if (Object.keys(fieldsToTranslate).length === 0) return {};

  const localeName = localeNames[locale] || locale;

  // Identify which defined fields are missing so AI can generate them
  const missingFields = fieldDefs
    .filter((def) => !fieldsToTranslate[def.key])
    .map((def) => `${def.key} (${def.type === 'array' ? 'array of strings' : def.type}, ${def.label})`);

  const missingSection = missingFields.length > 0
    ? `\n\nThe following fields are empty in English. Generate appropriate ${localeName} content for them based on the other fields above:\n${missingFields.join('\n')}`
    : '';

  const prompt = `You are a professional translator for a tour booking website. Translate the following English ${entityContext} content into ${localeName} (${locale}).

Content to translate:
${JSON.stringify(fieldsToTranslate, null, 2)}${missingSection}

Rules:
- Keep proper nouns (city names, brand names) in their commonly known local form (e.g. Cairo → القاهرة in Arabic)
${locale === 'ar' ? '- Produce proper RTL text for Arabic\n' : ''}- Keep translations natural and fluent, not literal word-for-word
- For SEO fields (metaTitle, metaDescription), optimize for the target language
- Array fields must remain arrays with the same number of items, each item translated
- For any missing fields you generate, create high-quality relevant content based on the title/description context
- Return a JSON object with ALL fields (both translated and generated): { "fieldName": "translated value", ... }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a translation API. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error('Empty response from translation model');

    const parsed = JSON.parse(text) as Record<string, string | string[]>;
    if (typeof parsed !== 'object' || parsed === null || Object.keys(parsed).length === 0) {
      throw new Error('Translation model returned no fields');
    }
    return parsed;
  } catch (error) {
    console.error(`Auto-translate failed for ${entityContext} (${locale}):`, error);
    throw error instanceof Error ? error : new Error('Translation failed');
  }
}

export function extractStructuredTourContent(doc: Record<string, unknown>): StructuredTourContent {
  const itinerary = Array.isArray(doc.itinerary)
    ? doc.itinerary.map((item) => {
        const record = (item || {}) as Record<string, unknown>;
        return {
          title: hasText(record.title) ? record.title : undefined,
          description: hasText(record.description) ? record.description : undefined,
          location: hasText(record.location) ? record.location : undefined,
          includes: Array.isArray(record.includes)
            ? record.includes.filter((entry): entry is string => hasText(entry))
            : undefined,
        };
      })
    : [];

  const faq = Array.isArray(doc.faq)
    ? doc.faq.map((item) => {
        const record = (item || {}) as Record<string, unknown>;
        return {
          question: hasText(record.question) ? record.question : undefined,
          answer: hasText(record.answer) ? record.answer : undefined,
        };
      })
    : [];

  const bookingOptions = Array.isArray(doc.bookingOptions)
    ? doc.bookingOptions.map((item) => {
        const record = (item || {}) as Record<string, unknown>;
        return {
          label: hasText(record.label) ? record.label : undefined,
          description: hasText(record.description) ? record.description : undefined,
          badge: hasText(record.badge) ? record.badge : undefined,
        };
      })
    : [];

  const addOns = Array.isArray(doc.addOns)
    ? doc.addOns.map((item) => {
        const record = (item || {}) as Record<string, unknown>;
        return {
          name: hasText(record.name) ? record.name : undefined,
          description: hasText(record.description) ? record.description : undefined,
        };
      })
    : [];

  return { itinerary, faq, bookingOptions, addOns };
}

const hasStructuredTourContent = (content: StructuredTourContent) =>
  content.itinerary.some((item) => Object.values(item).some((value) => hasText(value) || (Array.isArray(value) && value.length > 0))) ||
  content.faq.some((item) => Object.values(item).some((value) => hasText(value))) ||
  content.bookingOptions.some((item) => Object.values(item).some((value) => hasText(value))) ||
  content.addOns.some((item) => Object.values(item).some((value) => hasText(value)));

export async function translateStructuredTourContentForLocale(
  content: StructuredTourContent,
  locale: string
): Promise<StructuredTranslationMap> {
  const openai = getOpenAIClient();
  if (!openai || !hasStructuredTourContent(content)) return {};

  const localeName = localeNames[locale] || locale;
  const contentToTranslate: Record<string, unknown> = {};

  if (content.itinerary.length > 0) contentToTranslate.itinerary = content.itinerary;
  if (content.faq.length > 0) contentToTranslate.faq = content.faq;
  if (content.bookingOptions.length > 0) contentToTranslate.bookingOptions = content.bookingOptions;
  if (content.addOns.length > 0) contentToTranslate.addOns = content.addOns;

  const prompt = `You are a professional translator for a tour booking website. Translate the following structured English tour content into ${localeName} (${locale}).

Content to translate:
${JSON.stringify(contentToTranslate, null, 2)}

Rules:
- Preserve the same JSON keys and array order exactly
- Translate only text values that customers can read
- Keep proper nouns in their commonly used local form
${locale === 'ar' ? '- Produce proper RTL text for Arabic\n' : ''}- Keep the wording natural for a tourism website
- Keep empty values empty
- Return only a valid JSON object`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a translation API. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error('Empty response from translation model');

    const parsed = JSON.parse(text) as StructuredTranslationMap;
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Translation model returned invalid structured content');
    }
    return parsed;
  } catch (error) {
    console.error(`Auto-translate failed for structured tour content (${locale}):`, error);
    throw error instanceof Error ? error : new Error('Translation failed');
  }
}

export async function translateTourContentForLocale(
  fields: FieldValues,
  structuredContent: StructuredTourContent,
  locale: string
): Promise<Record<string, unknown>> {
  const [flatTranslations, structuredTranslations] = await Promise.all([
    translateEntityFieldsForLocale(fields, tourTranslationFields, 'tour', locale),
    translateStructuredTourContentForLocale(structuredContent, locale),
  ]);

  return {
    ...flatTranslations,
    ...structuredTranslations,
  };
}

// ── Convenience helpers that fetch, translate, and save back ──

/**
 * Fallback mappings: if a field is empty, derive it from another field.
 * e.g. metaTitle → title, metaDescription → description
 */
const FIELD_FALLBACKS: Record<string, { from: string; transform?: (v: string) => string }> = {
  metaTitle: { from: 'title', transform: (v) => v.length > 60 ? v.slice(0, 57) + '...' : v },
  metaDescription: { from: 'description', transform: (v) => v.length > 160 ? v.slice(0, 157) + '...' : v },
};

export function extractFields(doc: Record<string, unknown>, fieldDefs: TranslationFieldDef[]): FieldValues {
  const fields: FieldValues = {};
  for (const def of fieldDefs) {
    let val = doc[def.key];

    // Apply fallback if field is empty
    if ((!val || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) && FIELD_FALLBACKS[def.key]) {
      const fallback = FIELD_FALLBACKS[def.key];
      const source = doc[fallback.from];
      if (typeof source === 'string' && source.trim()) {
        val = fallback.transform ? fallback.transform(source) : source;
      }
    }

    if (typeof val === 'string') {
      fields[def.key] = val;
    } else if (Array.isArray(val)) {
      const filtered = val.filter((item): item is string => typeof item === 'string');
      if (filtered.length > 0) fields[def.key] = filtered;
    }
  }
  return fields;
}

/**
 * Build a per-locale $set payload so saving translations only touches the
 * locales that actually translated. A whole-map `$set: { translations }`
 * wiped every other locale (including manual translations) whenever a run
 * came back partial — the root cause of "translations keep disappearing".
 */
export function buildTranslationsSetOps(
  translations: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  const ops: Record<string, Record<string, unknown>> = {};
  for (const [locale, bucket] of Object.entries(translations)) {
    ops[`translations.${locale}`] = bucket;
  }
  return ops;
}

/** Translate every locale in parallel; failed locales are skipped, successful ones returned. */
async function translateLocalesSettled(
  translate: (locale: string) => Promise<Record<string, unknown>>
): Promise<Record<string, Record<string, unknown>>> {
  const results = await Promise.allSettled(
    translatableLocales.map(async (locale) => ({ locale, bucket: await translate(locale) }))
  );
  const translations: Record<string, Record<string, unknown>> = {};
  for (const result of results) {
    if (result.status === 'fulfilled' && Object.keys(result.value.bucket).length > 0) {
      translations[result.value.locale] = result.value.bucket;
    } else if (result.status === 'rejected') {
      console.error('Auto-translate locale failed:', result.reason);
    }
  }
  return translations;
}

export async function autoTranslateTour(tourId: string): Promise<void> {
  await dbConnect();
  const tour = await Tour.findById(tourId).lean();
  if (!tour) throw new Error('Tour not found');

  const fields = extractFields(tour as Record<string, unknown>, tourTranslationFields);
  const structuredContent = extractStructuredTourContent(tour as Record<string, unknown>);
  const translations = await translateLocalesSettled(
    (locale) => translateTourContentForLocale(fields, structuredContent, locale)
  );

  if (Object.keys(translations).length === 0) throw new Error('No tour translations were generated');

  await Tour.findByIdAndUpdate(tourId, { $set: buildTranslationsSetOps(translations) });
  revalidateStorefrontContent();
  console.log(`Auto-translated tour ${tourId} into ${Object.keys(translations).join(', ')}`);
}

export async function autoTranslateDestination(destinationId: string): Promise<void> {
  await dbConnect();
  const dest = await Destination.findById(destinationId).lean();
  if (!dest) throw new Error('Destination not found');

  const fields = extractFields(dest as Record<string, unknown>, destinationTranslationFields);
  const translations = await translateLocalesSettled(
    (locale) => translateEntityFieldsForLocale(fields, destinationTranslationFields, 'destination', locale)
  );
  if (Object.keys(translations).length === 0) throw new Error('No destination translations were generated');

  await Destination.findByIdAndUpdate(destinationId, { $set: buildTranslationsSetOps(translations) });
  revalidateStorefrontContent();
  console.log(`Auto-translated destination ${destinationId} into ${Object.keys(translations).join(', ')}`);
}

export async function autoTranslateCategory(categoryId: string): Promise<void> {
  await dbConnect();
  const cat = await Category.findById(categoryId).lean();
  if (!cat) throw new Error('Category not found');

  const fields = extractFields(cat as Record<string, unknown>, categoryTranslationFields);
  const translations = await translateLocalesSettled(
    (locale) => translateEntityFieldsForLocale(fields, categoryTranslationFields, 'category', locale)
  );
  if (Object.keys(translations).length === 0) throw new Error('No category translations were generated');

  await Category.findByIdAndUpdate(categoryId, { $set: buildTranslationsSetOps(translations) });
  revalidateStorefrontContent();
  console.log(`Auto-translated category ${categoryId} into ${Object.keys(translations).join(', ')}`);
}

export async function autoTranslateAttractionPage(pageId: string): Promise<void> {
  await dbConnect();
  const page = await AttractionPage.findById(pageId).lean();
  if (!page) throw new Error('Page not found');

  const fields = extractFields(page as Record<string, unknown>, attractionPageTranslationFields);
  const translations = await translateLocalesSettled(
    (locale) => translateEntityFieldsForLocale(fields, attractionPageTranslationFields, 'landing page', locale)
  );
  if (Object.keys(translations).length === 0) throw new Error('No page translations were generated');

  await AttractionPage.findByIdAndUpdate(pageId, { $set: buildTranslationsSetOps(translations) });
  revalidateStorefrontContent();
  console.log(`Auto-translated attraction page ${pageId} into ${Object.keys(translations).join(', ')}`);
}
