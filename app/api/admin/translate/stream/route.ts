import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import {
  canAccessTenant,
  requireAdminAuth,
  tenantForbiddenResponse,
} from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import {
  translateEntityFieldsForLocale,
  translateTourContentForLocale,
  translateStructuredSpecContentForLocale,
  extractFields,
  extractStructuredTourContent,
  extractStructuredSpecContent,
} from '@/lib/i18n/autoTranslate';
import {
  translatableLocales,
  localeNames,
  tourTranslationFields,
  destinationTranslationFields,
  categoryTranslationFields,
  attractionPageTranslationFields,
  destinationStructuredFields,
  categoryStructuredFields,
  attractionPageStructuredFields,
  normalizeTranslations,
  type StructuredTranslationSpec,
} from '@/lib/i18n/translationFields';
import { applySourceDraft, sanitizeSourceDraft } from '@/lib/i18n/sourceDraft';
import { enforceTranslationFieldLimits } from '@/lib/i18n/translationLimits';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import type { Model } from 'mongoose';

const VALID_MODEL_TYPES = ['tour', 'destination', 'category', 'attraction-page'] as const;
type ModelType = (typeof VALID_MODEL_TYPES)[number];
const LOCALE_DRAFT_MAX_CHARS = 200_000;

const TOUR_STRUCTURED_FIELDS: Record<string, string[]> = {
  itinerary: ['title', 'description', 'location', 'includes'],
  faq: ['question', 'answer'],
  bookingOptions: ['label', 'description', 'badge'],
  addOns: ['name', 'description'],
  imageMetadata: ['url', 'alt', 'title'],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const hasMeaningfulContent = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasMeaningfulContent);
  if (isRecord(value)) return Object.values(value).some(hasMeaningfulContent);
  return value !== undefined && value !== null;
};

/**
 * Auto-translate is additive by default. Existing non-empty values belong to
 * the administrator, so generated text can only fill gaps. Structured arrays
 * merge field-by-field; image captions use their URL identity when available.
 */
const mergePreservingExisting = (existing: unknown, generated: unknown): unknown => {
  if (Array.isArray(existing) && Array.isArray(generated)) {
    const existingByUrl = new Map(
      existing
        .filter(isRecord)
        .filter((entry) => typeof entry.url === 'string' && entry.url)
        .map((entry) => [String(entry.url), entry]),
    );
    const generatedByUrl = new Map(
      generated
        .filter(isRecord)
        .filter((entry) => typeof entry.url === 'string' && entry.url)
        .map((entry) => [String(entry.url), entry]),
    );
    if (generatedByUrl.size > 0) {
      const merged = generated.map((generatedEntry, index) => {
        const match = isRecord(generatedEntry) && typeof generatedEntry.url === 'string'
          ? existingByUrl.get(String(generatedEntry.url))
          : existing[index];
        return mergePreservingExisting(match, generatedEntry);
      });
      // Retain old manual captions whose source image was removed. They are
      // ignored by URL-based storefront localization but must not be destroyed
      // as a side effect of translating the current gallery.
      for (const [url, existingEntry] of existingByUrl) {
        if (!generatedByUrl.has(url)) merged.push(existingEntry);
      }
      return merged;
    }

    const length = Math.max(existing.length, generated.length);
    return Array.from({ length }, (_, index) => {
      const current = existing[index];
      return mergePreservingExisting(current, generated[index]);
    }).filter((entry) => entry !== undefined);
  }

  if (isRecord(existing) && isRecord(generated)) {
    const merged: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(generated), ...Object.keys(existing)])) {
      merged[key] = mergePreservingExisting(existing[key], generated[key]);
    }
    return merged;
  }

  return hasMeaningfulContent(existing) ? existing : generated;
};

const sanitizeStructuredEntries = (
  value: unknown,
  source: unknown,
  allowedFields: string[],
): Array<Record<string, unknown>> | undefined => {
  if (!Array.isArray(value) || !Array.isArray(source)) return undefined;
  return value.slice(0, source.length).map((entry) => {
    if (!isRecord(entry)) return {};
    return Object.fromEntries(
      Object.entries(entry).filter(([key, fieldValue]) => {
        if (!allowedFields.includes(key)) return false;
        if (key === 'includes') {
          return Array.isArray(fieldValue) && fieldValue.every((item) => typeof item === 'string');
        }
        return typeof fieldValue === 'string';
      }),
    );
  });
};

/** Keep model output inside the translation schema before it can reach Mongo. */
const sanitizeGeneratedBucket = (
  generated: Record<string, unknown>,
  fieldDefs: typeof tourTranslationFields,
  modelType: ModelType,
  source: Record<string, unknown>,
  structuredSpecs: StructuredTranslationSpec[],
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = enforceTranslationFieldLimits(generated, fieldDefs);

  const structuredFields = modelType === 'tour'
    ? TOUR_STRUCTURED_FIELDS
    : Object.fromEntries(
        structuredSpecs.map((spec) => [
          spec.key,
          spec.matchKey ? [...spec.fields, spec.matchKey] : spec.fields,
        ]),
      );

  for (const [key, allowedFields] of Object.entries(structuredFields)) {
    const entries = sanitizeStructuredEntries(generated[key], source[key], allowedFields);
    if (entries?.length) sanitized[key] = entries;
  }
  return sanitized;
};

async function POSTHandler(request: NextRequest) {
  // Authenticate before parsing or touching content. Model-specific permission
  // checks happen after the validated model type is known below.
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => null)) as {
    modelType?: ModelType;
    id?: string;
    locale?: string;
    sourceDraft?: unknown;
    localeDraft?: unknown;
  } | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { modelType, id, locale, sourceDraft, localeDraft } = body;
  if (!modelType || !VALID_MODEL_TYPES.includes(modelType)) {
    return NextResponse.json(
      { success: false, error: `Invalid modelType. Must be one of: ${VALID_MODEL_TYPES.join(', ')}` },
      { status: 400 },
    );
  }
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
  }
  if (!locale || !translatableLocales.some((supportedLocale) => supportedLocale === locale)) {
    return NextResponse.json(
      { success: false, error: `Invalid locale. Must be one of: ${translatableLocales.join(', ')}` },
      { status: 400 },
    );
  }

  const requiredPermission = modelType === 'tour' ? 'manageTours' : 'manageContent';
  if (auth.role !== 'super_admin' && !auth.permissions.includes(requiredPermission)) {
    return NextResponse.json(
      { success: false, error: 'You do not have permission to perform this action.' },
      { status: 403 },
    );
  }
  if (localeDraft !== undefined && !isRecord(localeDraft)) {
    return NextResponse.json(
      { success: false, error: 'localeDraft must be a plain translation object.' },
      { status: 400 },
    );
  }
  if (localeDraft && JSON.stringify(localeDraft).length > LOCALE_DRAFT_MAX_CHARS) {
    return NextResponse.json(
      { success: false, error: 'localeDraft is too large.' },
      { status: 400 },
    );
  }

  // The draft is the admin's unsaved English content. It only ever supplies
  // translatable fields — tenant scope, identity, and persistence stay driven
  // by the authenticated request and the saved document.
  const draft = sanitizeSourceDraft(modelType, sourceDraft);
  if (!draft.ok) {
    return NextResponse.json({ success: false, error: draft.error }, { status: 400 });
  }

  await dbConnect();
  const models = {
    tour: Tour,
    destination: Destination,
    category: Category,
    'attraction-page': AttractionPage,
  } as const;
  const model = models[modelType] as Model<Record<string, unknown>>;
  const target = await model.findById(id).select('tenantId').lean() as { tenantId?: string } | null;
  if (!target) {
    return NextResponse.json({ success: false, error: `${modelType} not found` }, { status: 404 });
  }
  const targetTenantId = String(target.tenantId || 'default');
  if (!canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();

  const fieldDefs = {
    tour: tourTranslationFields,
    destination: destinationTranslationFields,
    category: categoryTranslationFields,
    'attraction-page': attractionPageTranslationFields,
  }[modelType];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const doc = await model
          .findOne({ _id: id, tenantId: targetTenantId })
          .lean() as Record<string, unknown> | null;
        if (!doc) {
          send('error', { error: `${modelType} not found` });
          return;
        }

        // Translation reads the draft overlaid on the saved document; every
        // write below still targets the document by id under its tenant filter.
        const source = applySourceDraft(doc, draft.draft);

        const fields = extractFields(source, fieldDefs);
        const structuredTourContent = modelType === 'tour'
          ? extractStructuredTourContent(source)
          : null;
        const structuredSpecs: StructuredTranslationSpec[] = modelType === 'destination'
          ? destinationStructuredFields
          : modelType === 'category'
            ? categoryStructuredFields
          : modelType === 'attraction-page'
            ? attractionPageStructuredFields
            : [];
        const structuredEntityContent = structuredSpecs.length > 0
          ? extractStructuredSpecContent(source, structuredSpecs)
          : {};
        const hasFlatFields = Object.keys(fields).length > 0;
        const hasTourStructuredFields = modelType === 'tour' && structuredTourContent
          ? Object.values(structuredTourContent).some((value) => Array.isArray(value) && value.length > 0)
          : false;
        const hasEntityStructuredFields = Object.keys(structuredEntityContent).length > 0;

        if (!hasFlatFields && !hasTourStructuredFields && !hasEntityStructuredFields) {
          send('error', { error: 'No translatable content found' });
          return;
        }

        send('start', {
          locales: [locale],
          localeNames,
          totalLocales: 1,
        });
        const localeName = localeNames[locale] || locale;
        send('translating', { locale, localeName, total: 1 });

        let translated: Record<string, unknown>;
        if (modelType === 'tour') {
          translated = await translateTourContentForLocale(fields, structuredTourContent || {
            itinerary: [],
            faq: [],
            imageMetadata: [],
            bookingOptions: [],
            addOns: [],
          }, locale);
        } else {
          const [flat, structured] = await Promise.all([
            translateEntityFieldsForLocale(fields, fieldDefs, modelType, locale),
            translateStructuredSpecContentForLocale(
              structuredEntityContent,
              modelType,
              locale,
              structuredSpecs,
            ),
          ]);
          translated = { ...flat, ...structured };
        }

        const sanitized = sanitizeGeneratedBucket(
          translated,
          fieldDefs,
          modelType,
          source,
          structuredSpecs,
        );
        if (Object.keys(sanitized).length === 0) {
          throw new Error('No translated content returned');
        }
        const sanitizedLocaleDraft = localeDraft
          ? sanitizeGeneratedBucket(localeDraft, fieldDefs, modelType, source, structuredSpecs)
          : {};

        // Attraction pages use a Mongoose Map while the other entities use a
        // Mixed object. Normalize both before taking the compare-and-set snapshot.
        const translations = normalizeTranslations(doc.translations);
        const hadLocale = Object.prototype.hasOwnProperty.call(translations, locale);
        const existingBucket = isRecord(translations[locale]) ? translations[locale] : {};
        const generatedWithManualValues = mergePreservingExisting(
          existingBucket,
          sanitized,
        ) as Record<string, unknown>;
        // Non-empty text already typed in the open editor is an explicit owner
        // draft. It wins over both generated text and the older stored value,
        // and is committed only for this selected locale.
        const mergedBucket = mergePreservingExisting(
          sanitizedLocaleDraft,
          generatedWithManualValues,
        ) as Record<string, unknown>;
        const localePath = `translations.${locale}`;
        const snapshot = hadLocale ? existingBucket : { $exists: false };

        // Compare-and-set prevents a slow model call from overwriting a manual
        // edit made by another administrator while translation was running.
        const persisted = await model.findOneAndUpdate(
          { _id: id, tenantId: targetTenantId, [localePath]: snapshot },
          { $set: { [localePath]: mergedBucket } },
        );
        if (!persisted) {
          send('locale_error', {
            locale,
            localeName,
            total: 1,
            code: 'TRANSLATION_CONFLICT',
            error: `${localeName} changed while translation was running. Reload and try again.`,
          });
          send('done', {
            success: false,
            translatedLocales: [],
            failedLocales: [{ locale, error: 'Translation conflict' }],
          });
          return;
        }

        revalidateStorefrontContent();
        send('locale_done', {
          locale,
          localeName,
          total: 1,
          translations: mergedBucket,
          preservedExisting: hasMeaningfulContent(existingBucket) || hasMeaningfulContent(sanitizedLocaleDraft),
        });
        send('done', {
          success: true,
          translatedLocales: [locale],
          failedLocales: [],
        });
      } catch (error) {
        console.error('Streaming translate error:', error);
        const message = error instanceof Error ? error.message : 'Translation failed';
        send('locale_error', {
          locale,
          localeName: localeNames[locale] || locale,
          total: 1,
          error: message,
        });
        send('done', {
          success: false,
          translatedLocales: [],
          failedLocales: [{ locale, error: message }],
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export const POST = withAdminAudit(POSTHandler);
