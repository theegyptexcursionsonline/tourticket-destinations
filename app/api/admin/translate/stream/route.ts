import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
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
} from '@/lib/i18n/translationFields';

const VALID_MODEL_TYPES = ['tour', 'destination', 'category'] as const;
type ModelType = (typeof VALID_MODEL_TYPES)[number];

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  const { modelType, id } = (await request.json()) as {
    modelType: ModelType;
    id: string;
  };

  if (!modelType || !VALID_MODEL_TYPES.includes(modelType)) {
    return NextResponse.json(
      { success: false, error: `Invalid modelType. Must be one of: ${VALID_MODEL_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing id' },
      { status: 400 }
    );
  }

  await dbConnect();
  const model: any = modelType === 'tour' ? Tour : modelType === 'destination' ? Destination : Category;
  const target = await model.findById(id).select('tenantId').lean() as { tenantId?: string } | null;
  if (!target) return NextResponse.json({ success: false, error: `${modelType} not found` }, { status: 404 });
  const targetTenantId = String(target.tenantId || 'default');
  if (!canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();

  const fieldDefsMap = {
    tour: tourTranslationFields,
    destination: destinationTranslationFields,
    category: categoryTranslationFields,
  };

  const fieldDefs = fieldDefsMap[modelType];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await dbConnect();

        // Fetch the document
        let doc: Record<string, unknown> | null = null;
        if (modelType === 'tour') {
          doc = await Tour.findById(id).lean() as Record<string, unknown> | null;
        } else if (modelType === 'destination') {
          doc = await Destination.findById(id).lean() as Record<string, unknown> | null;
        } else if (modelType === 'category') {
          doc = await Category.findById(id).lean() as Record<string, unknown> | null;
        }

        if (!doc) {
          send('error', { error: `${modelType} not found` });
          controller.close();
          return;
        }

        const fields = extractFields(doc, fieldDefs);
        const structuredTourContent = modelType === 'tour'
          ? extractStructuredTourContent(doc)
          : null;

        const hasFlatFields = Object.keys(fields).length > 0;
        const hasStructuredFields = modelType === 'tour' && structuredTourContent
          ? ['itinerary', 'faq', 'bookingOptions', 'addOns'].some((key) => {
              const value = structuredTourContent[key as keyof typeof structuredTourContent];
              return Array.isArray(value) && value.length > 0;
            })
          : false;

        if (!hasFlatFields && !hasStructuredFields) {
          send('error', { error: 'No translatable content found' });
          controller.close();
          return;
        }

        send('start', {
          locales: translatableLocales,
          localeNames,
          totalLocales: translatableLocales.length,
        });

        const allTranslations: Record<string, Record<string, unknown>> = {};

        // Translate one locale at a time and stream each result
        for (let i = 0; i < translatableLocales.length; i++) {
          const locale = translatableLocales[i];
          const localeName = localeNames[locale] || locale;

          send('translating', {
            locale,
            localeName,
            index: i,
            total: translatableLocales.length,
          });

          const translated = modelType === 'tour'
            ? await translateTourContentForLocale(fields, structuredTourContent || {
                itinerary: [],
                faq: [],
                bookingOptions: [],
                addOns: [],
              }, locale)
            : await translateEntityFieldsForLocale(
                fields,
                fieldDefs,
                modelType,
                locale
              );

          if (Object.keys(translated).length > 0) {
            allTranslations[locale] = translated;
          }

          send('locale_done', {
            locale,
            localeName,
            index: i,
            total: translatableLocales.length,
            translations: translated,
          });
        }

        // Save all translations to DB
        if (Object.keys(allTranslations).length > 0) {
          send('saving', { message: 'Saving translations to database...' });

          if (modelType === 'tour') {
            await Tour.findOneAndUpdate({ _id: id, tenantId: targetTenantId }, { $set: { translations: allTranslations } });
          } else if (modelType === 'destination') {
            await Destination.findOneAndUpdate({ _id: id, tenantId: targetTenantId }, { $set: { translations: allTranslations } });
          } else if (modelType === 'category') {
            await Category.findOneAndUpdate({ _id: id, tenantId: targetTenantId }, { $set: { translations: allTranslations } });
          }
        }

        send('done', {
          success: true,
          translatedLocales: Object.keys(allTranslations),
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
