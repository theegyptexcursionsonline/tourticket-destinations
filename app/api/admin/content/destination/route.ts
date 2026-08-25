import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
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
  name?: string;
  slug?: string;
  country?: string;
  region?: string;
  description?: string;
  longDescription?: string;
  highlights?: unknown;
  bestTimeToVisit?: string;
  gettingThere?: string;
  gettingAround?: string;
  tags?: unknown;
  metaTitle?: string;
  metaDescription?: string;
  featuredImage?: string;
  published?: boolean;
  featured?: boolean;
};

type IncomingBody = {
  tenantId?: unknown;
  defaultLocale?: unknown;
  payload?: IncomingPayload;
  translations?: unknown;
};

function validate(payload: IncomingPayload | undefined): string | null {
  if (!payload) return 'payload is required';
  if (!payload.name || payload.name.length < 2) return 'name must be >= 2 chars';
  if (!payload.slug || !/^[a-z0-9-]+$/.test(payload.slug)) {
    return 'slug must contain only lowercase letters, numbers, and hyphens';
  }
  if (!payload.description || payload.description.length < 10) {
    return 'description must be >= 10 chars';
  }
  return null;
}

function stringArray(input: unknown, max = 12): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, max);
}

function travelTips(payload: IncomingPayload): Array<{ title: string; content: string }> {
  const tips: Array<{ title: string; content: string }> = [];
  if (payload.gettingThere?.trim()) {
    tips.push({ title: 'Getting there', content: payload.gettingThere.trim() });
  }
  if (payload.gettingAround?.trim()) {
    tips.push({ title: 'Getting around', content: payload.gettingAround.trim() });
  }
  return tips;
}

function normalizeDestinationTranslations(
  translations: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(Object.entries(translations).map(([locale, source]) => {
    const bucket = { ...source };
    const practical = bucket.practicalInfo && typeof bucket.practicalInfo === 'object' && !Array.isArray(bucket.practicalInfo)
      ? bucket.practicalInfo as Record<string, unknown>
      : {};
    const bestTimeToVisit = bucket.bestTimeToVisit ?? practical.bestTimeToVisit;
    const gettingThere = bucket.gettingThere ?? practical.gettingThere;
    const gettingAround = bucket.gettingAround ?? practical.gettingAround;
    const localizedTips: Array<{ title: string; content: string }> = [];
    if (typeof gettingThere === 'string' && gettingThere.trim()) {
      localizedTips.push({ title: 'Getting there', content: gettingThere.trim() });
    }
    if (typeof gettingAround === 'string' && gettingAround.trim()) {
      localizedTips.push({ title: 'Getting around', content: gettingAround.trim() });
    }
    delete bucket.practicalInfo;
    delete bucket.gettingThere;
    delete bucket.gettingAround;
    if (typeof bestTimeToVisit === 'string') bucket.bestTimeToVisit = bestTimeToVisit;
    if (localizedTips.length > 0) bucket.travelTips = localizedTips;
    return [locale, bucket];
  }));
}

function createdResponse(
  doc: { _id: unknown; slug: string },
  tenantId: ContentEngineTenantId,
  droppedLocales: string[],
  droppedTranslationFields: Record<string, string[]>,
) {
  return {
    id: String(doc._id),
    slug: doc.slug,
    liveUrl: contentEngineLiveUrl(tenantId, 'destination', doc.slug),
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
  const translated = sanitizeContentEngineTranslations('destination', body.translations);
  await dbConnect(tenant.tenantId);
  const begun = await beginContentPublish({
    idempotencyKey: key.key,
    tenantId: tenant.tenantId,
    contentType: 'destination',
    requestHash: hashPublishRequest(body),
  });
  if (begun.outcome === 'replay') return NextResponse.json(begun.body, { status: begun.status });
  if (begun.outcome === 'error') {
    return NextResponse.json({ error: begun.error, code: begun.code }, { status: begun.status });
  }
  const claim: PublishClaim = begun;

  const existing = await Destination.findOne(strictTenantSlugQuery(tenant.tenantId, payload.slug!));
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
      { error: `A destination with slug "${payload.slug}" already exists for this tenant` },
      { status: 409 },
    );
  }
  const existingName = await Destination.findOne({ tenantId: tenant.tenantId, name: payload.name });
  if (existingName) {
    await releaseContentPublishClaim(claim);
    return NextResponse.json(
      { error: `A destination named "${payload.name}" already exists for this tenant` },
      { status: 409 },
    );
  }

  let contentWritten = false;
  try {
    const tags = stringArray(payload.tags);
    if (payload.region?.trim() && !tags.includes(payload.region.trim())) tags.push(payload.region.trim());
    const doc = await Destination.create({
      _id: claim.resourceId,
      tenantId: tenant.tenantId,
      name: payload.name,
      slug: payload.slug,
      urlType: 'direct',
      country: payload.country,
      description: payload.description,
      longDescription: payload.longDescription,
      highlights: stringArray(payload.highlights),
      bestTimeToVisit: payload.bestTimeToVisit,
      travelTips: travelTips(payload),
      tags: tags.slice(0, 12),
      metaTitle: payload.metaTitle,
      metaDescription: payload.metaDescription,
      image: payload.featuredImage,
      featured: payload.featured === true,
      isPublished: payload.published !== false,
      translations: normalizeDestinationTranslations(translated.translations),
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
        const recovered = await Destination.findOne({
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
