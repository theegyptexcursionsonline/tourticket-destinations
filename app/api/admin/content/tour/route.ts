import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import { verifyContentEngine } from '@/lib/auth/verifyContentEngine';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import {
  contentEngineLiveUrl,
  resolveContentEngineLocale,
  resolveContentEngineTenant,
  sanitizeContentEngineTranslations,
  strictTenantSlugQuery,
  withContentEngineTenantGate,
  type ContentEngineTenantId,
} from '@/lib/content-engine/receiverContract';
import {
  beginContentPublish,
  completeContentPublish,
  hashPublishRequest,
  readRequiredIdempotencyKey,
  releaseContentPublishClaim,
  type PublishClaim,
} from '@/lib/content-engine/publishIdempotency';

type IncomingPayload = {
  title?: string;
  slug?: string;
  location?: string;
  duration?: string;
  description?: string;
  longDescription?: string;
  highlights?: unknown;
  whatsIncluded?: unknown;
  whatsNotIncluded?: unknown;
  itinerary?: unknown;
  faq?: unknown;
  tags?: unknown;
  metaTitle?: string;
  metaDescription?: string;
  featuredImage?: string;
  destinationSlug?: string;
  categorySlug?: string;
};

type IncomingBody = {
  tenantId?: unknown;
  defaultLocale?: unknown;
  payload?: IncomingPayload;
  translations?: unknown;
};

function validate(payload: IncomingPayload | undefined): string | null {
  if (!payload) return 'payload is required';
  if (!payload.title || payload.title.length < 5) return 'title must be >= 5 chars';
  if (!payload.slug || !/^[a-z0-9-]+$/.test(payload.slug)) {
    return 'slug must contain only lowercase letters, numbers, and hyphens';
  }
  if (!payload.description || payload.description.length < 20) {
    return 'description must be >= 20 chars';
  }
  if (!payload.duration) return 'duration is required';
  return null;
}

function stringArray(input: unknown, max = 12): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, max);
}

function itinerary(input: unknown): Array<{ time?: string; title: string; description: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item && typeof item === 'object'
      ? item as { time?: unknown; title?: unknown; description?: unknown }
      : {})
    .filter((item): item is { time?: unknown; title: string; description: string } =>
      typeof item.title === 'string' && item.title.trim().length > 0 &&
      typeof item.description === 'string' && item.description.trim().length > 0)
    .map((item) => ({
      ...(typeof item.time === 'string' && item.time.trim() ? { time: item.time.trim() } : {}),
      title: item.title.trim(),
      description: item.description.trim(),
    }))
    .slice(0, 12);
}

function faq(input: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item && typeof item === 'object'
      ? item as { question?: unknown; answer?: unknown }
      : {})
    .filter((item): item is { question: string; answer: string } =>
      typeof item.question === 'string' && item.question.trim().length > 0 &&
      typeof item.answer === 'string' && item.answer.trim().length > 0)
    .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
    .slice(0, 12);
}

function normalizeTourTranslations(
  translations: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(Object.entries(translations).map(([locale, source]) => {
    const bucket = { ...source };
    if (bucket.faq === undefined && Array.isArray(bucket.faqs)) bucket.faq = bucket.faqs;
    delete bucket.faqs;
    return [locale, bucket];
  }));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type TenantReference = { _id: unknown };

async function resolveDestinationId(
  tenantId: ContentEngineTenantId,
  payload: IncomingPayload,
): Promise<TenantReference | null> {
  if (payload.destinationSlug) {
    return await Destination.findOne({ tenantId, slug: payload.destinationSlug })
      .select('_id').lean() as TenantReference | null;
  }
  const locationName = payload.location?.split(',')[0]?.trim();
  if (locationName) {
    const exact = await Destination.findOne({
      tenantId,
      name: { $regex: `^${escapeRegex(locationName)}$`, $options: 'i' },
    }).select('_id').lean() as TenantReference | null;
    if (exact) return exact;
  }
  return await Destination.findOne({ tenantId }).sort({ createdAt: 1, _id: 1 })
    .select('_id').lean() as TenantReference | null;
}

async function resolveCategoryId(
  tenantId: ContentEngineTenantId,
  payload: IncomingPayload,
): Promise<TenantReference | null> {
  if (payload.categorySlug) {
    return await Category.findOne({ tenantId, slug: payload.categorySlug })
      .select('_id').lean() as TenantReference | null;
  }
  return await Category.findOne({ tenantId }).sort({ createdAt: 1, _id: 1 })
    .select('_id').lean() as TenantReference | null;
}

const DRAFT_WARNING =
  'Tour created in DRAFT mode (isPublished=false). Complete pricing, booking options, and final destination/category in the tenant admin before manual publication.';

function createdResponse(
  doc: { _id: unknown; slug: string },
  tenantId: ContentEngineTenantId,
  droppedLocales: string[],
  droppedTranslationFields: Record<string, string[]>,
) {
  return {
    id: String(doc._id),
    slug: doc.slug,
    liveUrl: contentEngineLiveUrl(tenantId, 'tour', doc.slug),
    status: 'draft',
    requiresManualPublish: true,
    warning: DRAFT_WARNING,
    droppedLocales,
    droppedTranslationFields,
  };
}

async function POSTHandler(request: NextRequest) {
  const authError = verifyContentEngine(request);
  if (authError) return authError;
  const body = await request.json() as IncomingBody;
  const tenant = resolveContentEngineTenant(body.tenantId);
  if (!tenant.ok) return NextResponse.json({ error: tenant.error }, { status: 422 });
  const locale = resolveContentEngineLocale(body.defaultLocale);
  if (!locale.ok) return NextResponse.json({ error: locale.error }, { status: 422 });
  const validationError = validate(body.payload);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const key = readRequiredIdempotencyKey(request.headers.get('idempotency-key'));
  if (!key.ok) return NextResponse.json({ error: key.error }, { status: 400 });

  const payload = body.payload!;
  const translated = sanitizeContentEngineTranslations('tour', body.translations);
  await dbConnect(tenant.tenantId);
  const begun = await beginContentPublish({
    idempotencyKey: key.key,
    tenantId: tenant.tenantId,
    contentType: 'tour',
    requestHash: hashPublishRequest(body),
  });
  if (begun.outcome === 'replay') return NextResponse.json(begun.body, { status: begun.status });
  if (begun.outcome === 'error') {
    return NextResponse.json({ error: begun.error, code: begun.code }, { status: begun.status });
  }
  const claim: PublishClaim = begun;

  const existing = await Tour.findOne(strictTenantSlugQuery(tenant.tenantId, payload.slug!));
  if (existing) {
    if (String(existing._id) === claim.resourceId) {
      const recovered = createdResponse(
        existing, tenant.tenantId, translated.droppedLocales, translated.droppedFields,
      );
      await completeContentPublish(claim, 201, recovered);
      return NextResponse.json(recovered, { status: 201 });
    }
    await releaseContentPublishClaim(claim);
    return NextResponse.json(
      { error: `A tour with slug "${payload.slug}" already exists for this tenant` },
      { status: 409 },
    );
  }

  const [destination, category] = await Promise.all([
    resolveDestinationId(tenant.tenantId, payload),
    resolveCategoryId(tenant.tenantId, payload),
  ]);
  if (!destination || !category) {
    await releaseContentPublishClaim(claim);
    return NextResponse.json(
      {
        error: !destination
          ? 'Cannot create tour draft: this tenant has no Destination'
          : 'Cannot create tour draft: this tenant has no Category',
      },
      { status: 422 },
    );
  }

  let contentWritten = false;
  try {
    const doc = await Tour.create({
      _id: claim.resourceId,
      tenantId: tenant.tenantId,
      tenantIds: [tenant.tenantId],
      title: payload.title,
      slug: payload.slug,
      urlType: 'direct',
      destination: destination._id,
      category: [category._id],
      description: payload.description,
      longDescription: payload.longDescription,
      location: payload.location,
      duration: payload.duration,
      highlights: stringArray(payload.highlights),
      whatsIncluded: stringArray(payload.whatsIncluded),
      whatsNotIncluded: stringArray(payload.whatsNotIncluded),
      itinerary: itinerary(payload.itinerary),
      faq: faq(payload.faq),
      tags: stringArray(payload.tags),
      metaTitle: payload.metaTitle,
      metaDescription: payload.metaDescription,
      image: payload.featuredImage,
      discountPrice: 0,
      price: 0,
      isPublished: false,
      isFeatured: false,
      translations: normalizeTourTranslations(translated.translations),
    });
    contentWritten = true;
    const created = createdResponse(
      doc, tenant.tenantId, translated.droppedLocales, translated.droppedFields,
    );
    await completeContentPublish(claim, 201, created);
    revalidateStorefrontContent(tenant.tenantId);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (!contentWritten) {
      try {
        const recovered = await Tour.findOne({
          _id: claim.resourceId,
          ...strictTenantSlugQuery(tenant.tenantId, payload.slug!),
        });
        if (recovered) {
          const response = createdResponse(
            recovered, tenant.tenantId, translated.droppedLocales, translated.droppedFields,
          );
          await completeContentPublish(claim, 201, response);
          revalidateStorefrontContent(tenant.tenantId);
          return NextResponse.json(response, { status: 201 });
        }
        await releaseContentPublishClaim(claim);
      } catch {
        // Keep an inconclusive claim pending for stale-lease recovery.
      }
    }
    const message = error instanceof Error ? error.message : 'Insert failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withContentEngineTenantGate(withAdminAudit(POSTHandler));
