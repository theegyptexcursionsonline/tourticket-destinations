import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
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
  name?: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  highlights?: unknown;
  features?: unknown;
  keywords?: unknown;
  tags?: unknown;
  metaTitle?: string;
  metaDescription?: string;
  heroImage?: string;
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

function createdResponse(
  doc: { _id: unknown; slug: string },
  tenantId: ContentEngineTenantId,
  droppedLocales: string[],
  droppedTranslationFields: Record<string, string[]>,
) {
  return {
    id: String(doc._id),
    slug: doc.slug,
    liveUrl: contentEngineLiveUrl(tenantId, 'category', doc.slug),
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
  const translated = sanitizeContentEngineTranslations('category', body.translations);
  await dbConnect(tenant.tenantId);
  const begun = await beginContentPublish({
    idempotencyKey: key.key,
    tenantId: tenant.tenantId,
    contentType: 'category',
    requestHash: hashPublishRequest(body),
  });
  if (begun.outcome === 'replay') return NextResponse.json(begun.body, { status: begun.status });
  if (begun.outcome === 'error') {
    return NextResponse.json({ error: begun.error, code: begun.code }, { status: begun.status });
  }
  const claim: PublishClaim = begun;

  const existing = await Category.findOne(strictTenantSlugQuery(tenant.tenantId, payload.slug!));
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
      { error: `A category with slug "${payload.slug}" already exists for this tenant` },
      { status: 409 },
    );
  }
  const existingName = await Category.findOne({ tenantId: tenant.tenantId, name: payload.name });
  if (existingName) {
    await releaseContentPublishClaim(claim);
    return NextResponse.json(
      { error: `A category named "${payload.name}" already exists for this tenant` },
      { status: 409 },
    );
  }

  let contentWritten = false;
  try {
    const doc = await Category.create({
      _id: claim.resourceId,
      tenantId: tenant.tenantId,
      name: payload.name,
      slug: payload.slug,
      urlType: 'direct',
      description: payload.description,
      longDescription: payload.longDescription,
      highlights: stringArray(payload.highlights),
      features: stringArray(payload.features),
      keywords: stringArray(payload.keywords ?? payload.tags),
      metaTitle: payload.metaTitle,
      metaDescription: payload.metaDescription,
      heroImage: payload.heroImage || payload.featuredImage,
      featured: payload.featured === true,
      isPublished: payload.published !== false,
      translations: translated.translations,
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
        const recovered = await Category.findOne({
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
