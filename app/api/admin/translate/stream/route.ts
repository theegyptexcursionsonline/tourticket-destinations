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
  extractFields,
  extractStructuredTourContent,
} from '@/lib/i18n/autoTranslate';
import {
  translatableLocales,
  localeNames,
  tourTranslationFields,
  destinationTranslationFields,
  categoryTranslationFields,
  attractionPageTranslationFields,
} from '@/lib/i18n/translationFields';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import type { Model } from 'mongoose';

const VALID_MODEL_TYPES = ['tour', 'destination', 'category', 'attraction-page'] as const;
type ModelType = (typeof VALID_MODEL_TYPES)[number];

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, {
    permissions: ['manageTours', 'manageContent'],
    requireAll: false,
  });
  if (auth instanceof NextResponse) return auth;

  const { modelType, id } = (await request.json()) as { modelType: ModelType; id: string };
  if (!modelType || !VALID_MODEL_TYPES.includes(modelType)) {
    return NextResponse.json(
      { success: false, error: `Invalid modelType. Must be one of: ${VALID_MODEL_TYPES.join(', ')}` },
      { status: 400 },
    );
  }
  if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

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

      const saveLocale = async (locale: string, bucket: Record<string, unknown>) => {
        const filter = { _id: id, tenantId: targetTenantId };
        const update = { $set: { [`translations.${locale}`]: bucket } };
        await model.findOneAndUpdate(filter, update);
      };

      try {
        const doc = await model
          .findOne({ _id: id, tenantId: targetTenantId })
          .lean() as Record<string, unknown> | null;
        if (!doc) {
          send('error', { error: `${modelType} not found` });
          return;
        }

        const fields = extractFields(doc, fieldDefs);
        const structuredTourContent = modelType === 'tour'
          ? extractStructuredTourContent(doc)
          : null;
        const hasFlatFields = Object.keys(fields).length > 0;
        const hasStructuredFields = modelType === 'tour' && structuredTourContent
          ? Object.values(structuredTourContent).some((value) => Array.isArray(value) && value.length > 0)
          : false;

        if (!hasFlatFields && !hasStructuredFields) {
          send('error', { error: 'No translatable content found' });
          return;
        }

        send('start', {
          locales: translatableLocales,
          localeNames,
          totalLocales: translatableLocales.length,
        });
        for (const locale of translatableLocales) {
          send('translating', {
            locale,
            localeName: localeNames[locale] || locale,
            total: translatableLocales.length,
          });
        }

        const succeeded: string[] = [];
        const failed: Array<{ locale: string; error: string }> = [];

        await Promise.all(translatableLocales.map(async (locale, index) => {
          const localeName = localeNames[locale] || locale;
          try {
            const translated = modelType === 'tour'
              ? await translateTourContentForLocale(fields, structuredTourContent || {
                  itinerary: [],
                  faq: [],
                  bookingOptions: [],
                  addOns: [],
                }, locale)
              : await translateEntityFieldsForLocale(fields, fieldDefs, modelType, locale);

            if (Object.keys(translated).length === 0) {
              throw new Error('No translated content returned');
            }
            await saveLocale(locale, translated);
            succeeded.push(locale);
            send('locale_done', {
              locale,
              localeName,
              index,
              total: translatableLocales.length,
              translations: translated,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Translation failed';
            failed.push({ locale, error: message });
            send('locale_error', {
              locale,
              localeName,
              index,
              total: translatableLocales.length,
              error: message,
            });
          }
        }));

        if (succeeded.length > 0) revalidateStorefrontContent();
        send('done', {
          success: failed.length === 0,
          translatedLocales: succeeded,
          failedLocales: failed,
        });
      } catch (error) {
        console.error('Streaming translate error:', error);
        send('error', {
          error: error instanceof Error ? error.message : 'Translation failed',
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
