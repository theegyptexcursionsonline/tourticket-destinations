// lib/translation/translateService.ts
// Auto-translation service using OpenAI API for tour content

import OpenAI from 'openai';

const TARGET_LOCALES = ['ar', 'ru', 'de'] as const;
type TargetLocale = typeof TARGET_LOCALES[number];

const LOCALE_NAMES: Record<TargetLocale, string> = {
  ar: 'Arabic',
  ru: 'Russian',
  de: 'German',
};

// Fields to translate on a Tour document
const TOUR_TEXT_FIELDS = [
  'title', 'description', 'longDescription', 'meetingPoint',
  'cancellationPolicy', 'metaTitle', 'metaDescription',
  'physicalRequirements', 'transportationDetails', 'mealInfo',
  'weatherPolicy', 'photoPolicy', 'tipPolicy', 'seasonalVariations',
] as const;

const TOUR_ARRAY_FIELDS = [
  'includes', 'highlights', 'whatsIncluded', 'whatsNotIncluded',
  'whatToBring', 'whatToWear', 'healthSafety', 'culturalInfo',
  'localCustoms', 'accessibilityInfo',
] as const;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
}

interface TranslatableContent {
  fields: Record<string, string>;
  arrays: Record<string, string[]>;
  itinerary: Array<{ title: string; description: string; location?: string; includes?: string[] }>;
  faq: Array<{ question: string; answer: string }>;
  bookingOptions: Array<{ id: string; label: string; description?: string; badge?: string }>;
  addOns: Array<{ name: string; description: string }>;
}

/**
 * Extract all translatable content from a tour document
 */
export function extractTranslatableContent(tour: Record<string, unknown>): TranslatableContent {
  const fields: Record<string, string> = {};
  const arrays: Record<string, string[]> = {};

  // Simple text fields
  for (const field of TOUR_TEXT_FIELDS) {
    const value = tour[field];
    if (typeof value === 'string' && value.trim()) {
      fields[field] = value;
    }
  }

  // Array fields
  for (const field of TOUR_ARRAY_FIELDS) {
    const value = tour[field];
    if (Array.isArray(value) && value.length > 0) {
      const filtered = value.filter((v: unknown) => typeof v === 'string' && v.trim());
      if (filtered.length > 0) {
        arrays[field] = filtered;
      }
    }
  }

  // Itinerary items
  const itinerary: TranslatableContent['itinerary'] = [];
  if (Array.isArray(tour.itinerary)) {
    for (const item of tour.itinerary) {
      if (item && typeof item === 'object') {
        const entry: TranslatableContent['itinerary'][number] = {
          title: (item as Record<string, unknown>).title as string || '',
          description: (item as Record<string, unknown>).description as string || '',
        };
        if ((item as Record<string, unknown>).location) {
          entry.location = (item as Record<string, unknown>).location as string;
        }
        if (Array.isArray((item as Record<string, unknown>).includes)) {
          entry.includes = ((item as Record<string, unknown>).includes as string[]).filter(Boolean);
        }
        itinerary.push(entry);
      }
    }
  }

  // FAQ items
  const faq: TranslatableContent['faq'] = [];
  if (Array.isArray(tour.faq)) {
    for (const item of tour.faq) {
      if (item && typeof item === 'object') {
        faq.push({
          question: (item as Record<string, unknown>).question as string || '',
          answer: (item as Record<string, unknown>).answer as string || '',
        });
      }
    }
  }

  // Booking options
  const bookingOptions: TranslatableContent['bookingOptions'] = [];
  if (Array.isArray(tour.bookingOptions)) {
    for (const opt of tour.bookingOptions) {
      if (opt && typeof opt === 'object') {
        const o = opt as Record<string, unknown>;
        bookingOptions.push({
          id: (o.id as string) || '',
          label: (o.label as string) || '',
          description: (o.description as string) || undefined,
          badge: (o.badge as string) || undefined,
        });
      }
    }
  }

  // Add-ons
  const addOns: TranslatableContent['addOns'] = [];
  if (Array.isArray(tour.addOns)) {
    for (const addon of tour.addOns) {
      if (addon && typeof addon === 'object') {
        const a = addon as Record<string, unknown>;
        addOns.push({
          name: (a.name as string) || '',
          description: (a.description as string) || '',
        });
      }
    }
  }

  return { fields, arrays, itinerary, faq, bookingOptions, addOns };
}

/**
 * Translate content to a single target locale using OpenAI API
 */
async function translateToLocale(
  content: TranslatableContent,
  targetLocale: TargetLocale,
): Promise<Record<string, unknown>> {
  const client = getClient();
  const langName = LOCALE_NAMES[targetLocale];

  const prompt = `You are a professional translator specializing in tourism and travel content.
Translate the following JSON content from English to ${langName}.

Rules:
- Preserve all JSON structure exactly (keys must remain the same, in English)
- Translate only the string VALUES
- Keep proper nouns (place names, brand names) in their commonly used ${langName} form
- Use natural, fluent ${langName} appropriate for tourism marketing
- Preserve any HTML tags within strings
- For Arabic: use Modern Standard Arabic suitable for tourism websites
- Return ONLY valid JSON, no explanation or markdown

Content to translate:
${JSON.stringify(content, null, 2)}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 8000,
    messages: [
      { role: 'system', content: 'You are a professional translator. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
  });

  const text = response.choices[0]?.message?.content || '';

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error(`Failed to parse ${langName} translation response:`, error);
    throw new Error(`Invalid JSON in ${langName} translation response`);
  }
}

/**
 * Translate a tour document to all target locales.
 * Returns the translations object to store on the tour.
 */
export async function translateTourContent(
  tour: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const content = extractTranslatableContent(tour);

  // Skip if there's nothing to translate
  const hasContent = Object.keys(content.fields).length > 0 ||
    Object.keys(content.arrays).length > 0 ||
    content.itinerary.length > 0 ||
    content.faq.length > 0;

  if (!hasContent) {
    return {};
  }

  const translations: Record<string, unknown> = {};

  // Translate to all locales in parallel
  const results = await Promise.allSettled(
    TARGET_LOCALES.map(async (locale) => {
      const translated = await translateToLocale(content, locale);
      return { locale, translated };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      translations[result.value.locale] = result.value.translated;
    } else {
      console.error('Translation failed for a locale:', result.reason);
    }
  }

  return translations;
}

/**
 * Fire-and-forget translation that updates the tour in DB after translating.
 * Use this after a successful admin save to avoid blocking the response.
 */
export async function translateTourInBackground(tourId: string): Promise<void> {
  try {
    // Dynamic import to avoid circular dependencies
    const { default: dbConnect } = await import('@/lib/dbConnect');
    const { default: Tour } = await import('@/lib/models/Tour');

    await dbConnect();
    const tour = await Tour.findById(tourId).lean();
    if (!tour) {
      console.warn(`[Translation] Tour ${tourId} not found`);
      return;
    }

    console.log(`[Translation] Starting translation for tour: ${(tour as Record<string, unknown>).title}`);
    const translations = await translateTourContent(tour as Record<string, unknown>);

    if (Object.keys(translations).length > 0) {
      await Tour.findByIdAndUpdate(tourId, { translations });
      console.log(`[Translation] Completed translation for tour: ${(tour as Record<string, unknown>).title}`);
    }
  } catch (error) {
    console.error(`[Translation] Failed for tour ${tourId}:`, error);
  }
}

/**
 * Translate multiple tours (for bulk/migration use)
 */
export async function translateAllTours(
  options: { tenantId?: string; force?: boolean; batchSize?: number } = {}
): Promise<{ translated: number; failed: number; skipped: number }> {
  const { tenantId, force = false, batchSize = 5 } = options;

  const { default: dbConnect } = await import('@/lib/dbConnect');
  const { default: Tour } = await import('@/lib/models/Tour');

  await dbConnect();

  const query: Record<string, unknown> = { isPublished: true };
  if (tenantId) query.tenantId = tenantId;
  if (!force) {
    // Only translate tours that don't have translations yet
    query.$or = [
      { translations: { $exists: false } },
      { translations: {} },
      { 'translations.ar': { $exists: false } },
    ];
  }

  const tours = await Tour.find(query).select('_id title').lean();
  console.log(`[Translation] Found ${tours.length} tours to translate`);

  let translated = 0;
  let failed = 0;
  let skipped = 0;

  // Process in batches to avoid rate limits
  for (let i = 0; i < tours.length; i += batchSize) {
    const batch = tours.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (tour) => {
        const fullTour = await Tour.findById(tour._id).lean();
        if (!fullTour) {
          skipped++;
          return;
        }
        const translations = await translateTourContent(fullTour as Record<string, unknown>);
        if (Object.keys(translations).length > 0) {
          await Tour.findByIdAndUpdate(tour._id, { translations });
          translated++;
          console.log(`[Translation] ${translated}/${tours.length} - ${(tour as Record<string, unknown>).title}`);
        } else {
          skipped++;
        }
      })
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        failed++;
        console.error('[Translation] Batch item failed:', result.reason);
      }
    }

    // Small delay between batches to respect rate limits
    if (i + batchSize < tours.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { translated, failed, skipped };
}
