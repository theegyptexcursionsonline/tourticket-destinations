import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
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

const BLOG_CATEGORIES = new Set([
  'travel-tips', 'destination-guides', 'food-culture', 'adventure',
  'budget-travel', 'luxury-travel', 'solo-travel', 'family-travel',
  'photography', 'local-insights', 'seasonal-travel', 'transportation',
  'accommodation', 'news-updates',
]);

type IncomingPayload = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  tags?: unknown;
  metaTitle?: string;
  metaDescription?: string;
  author?: string;
  featuredImage?: string;
  readTime?: number;
  status?: string;
  featured?: boolean;
  faqs?: unknown;
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
  if (!payload.excerpt || payload.excerpt.length < 10) return 'excerpt must be >= 10 chars';
  if (!payload.content || payload.content.length < 100) return 'content must be >= 100 chars';
  if (!payload.category || !BLOG_CATEGORIES.has(payload.category)) {
    return `category must be one of: ${[...BLOG_CATEGORIES].join(', ')}`;
  }
  return null;
}

function stringArray(input: unknown, max: number): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, max);
}

function faqs(input: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const value = item && typeof item === 'object'
        ? item as { question?: unknown; answer?: unknown }
        : {};
      return {
        question: typeof value.question === 'string' ? value.question.trim() : '',
        answer: typeof value.answer === 'string' ? value.answer.trim() : '',
      };
    })
    .filter((item) => item.question.length > 0 && item.answer.length > 0)
    .slice(0, 10);
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
    liveUrl: contentEngineLiveUrl(tenantId, 'blog', doc.slug),
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
  const translated = sanitizeContentEngineTranslations('blog', body.translations);
  await dbConnect(tenant.tenantId);
  const begun = await beginContentPublish({
    idempotencyKey: key.key,
    tenantId: tenant.tenantId,
    contentType: 'blog',
    requestHash: hashPublishRequest(body),
  });
  if (begun.outcome === 'replay') return NextResponse.json(begun.body, { status: begun.status });
  if (begun.outcome === 'error') {
    return NextResponse.json({ error: begun.error, code: begun.code }, { status: begun.status });
  }
  const claim: PublishClaim = begun;

  const existing = await Blog.findOne(strictTenantSlugQuery(tenant.tenantId, payload.slug!));
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
      {
        error: `A blog post with slug "${payload.slug}" already exists for this tenant`,
        existingId: String(existing._id),
      },
      { status: 409 },
    );
  }

  let contentWritten = false;
  try {
    const doc = await Blog.create({
      _id: claim.resourceId,
      tenantId: tenant.tenantId,
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      content: payload.content,
      category: payload.category,
      tags: stringArray(payload.tags, 10),
      faqs: faqs(payload.faqs),
      author: payload.author?.trim() || 'Editorial Team',
      featuredImage: payload.featuredImage ||
        'https://res.cloudinary.com/dm3sxllch/image/upload/v1781977478/foxes-content-engine/heroes/loxyoywr6qhln7dnpaig.jpg',
      metaTitle: payload.metaTitle,
      metaDescription: payload.metaDescription,
      readTime: payload.readTime,
      status: payload.status === 'draft' ? 'draft' : 'published',
      featured: payload.featured === true,
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
        const recovered = await Blog.findOne({
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
        // An inconclusive readback must leave the claim pending. A retry can
        // take over the stale lease and prove ownership with resourceId.
      }
    }
    const message = error instanceof Error ? error.message : 'Insert failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function PUTHandler(request: NextRequest) {
  const authError = verifyContentEngine(request);
  if (authError) return authError;

  const body = await request.json() as IncomingBody;
  const tenant = resolveContentEngineTenant(body.tenantId);
  if (!tenant.ok) return NextResponse.json({ error: tenant.error }, { status: 422 });
  const locale = resolveContentEngineLocale(body.defaultLocale);
  if (!locale.ok) return NextResponse.json({ error: locale.error }, { status: 422 });
  const validationError = validate(body.payload);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const payload = body.payload!;
  const translated = sanitizeContentEngineTranslations('blog', body.translations);
  await dbConnect(tenant.tenantId);
  const existing = await Blog.findOne(strictTenantSlugQuery(tenant.tenantId, payload.slug!));
  if (!existing) {
    return NextResponse.json(
      { error: `No blog post with slug "${payload.slug}" for this tenant` },
      { status: 404 },
    );
  }

  // PUT predates the formal publishing contract, so a missing key remains
  // accepted for compatibility. When a key is present it gets the same durable
  // replay/body-conflict semantics as POST.
  const rawKey = request.headers.get('idempotency-key');
  let claim: PublishClaim | null = null;
  if (rawKey) {
    const key = readRequiredIdempotencyKey(rawKey);
    if (!key.ok) return NextResponse.json({ error: key.error }, { status: 400 });
    const begun = await beginContentPublish({
      idempotencyKey: key.key,
      tenantId: tenant.tenantId,
      contentType: 'blog:update',
      requestHash: hashPublishRequest(body),
      resourceId: String(existing._id),
    });
    if (begun.outcome === 'replay') return NextResponse.json(begun.body, { status: begun.status });
    if (begun.outcome === 'error') {
      return NextResponse.json({ error: begun.error, code: begun.code }, { status: begun.status });
    }
    claim = begun;
  }

  existing.title = payload.title!;
  existing.excerpt = payload.excerpt!;
  existing.content = payload.content!;
  existing.category = payload.category!;
  existing.tags = Array.isArray(payload.tags) ? stringArray(payload.tags, 10) : existing.tags;
  if (Array.isArray(payload.faqs)) existing.faqs = faqs(payload.faqs);
  if (payload.metaTitle) existing.metaTitle = payload.metaTitle;
  if (payload.metaDescription) existing.metaDescription = payload.metaDescription;
  if (payload.featuredImage) existing.featuredImage = payload.featuredImage;
  if (payload.author) existing.author = payload.author;
  if (typeof payload.featured === 'boolean') existing.featured = payload.featured;
  if (body.translations !== undefined) existing.translations = translated.translations;

  let contentWritten = false;
  try {
    await existing.save();
    contentWritten = true;
    const updated = createdResponse(
      existing, tenant.tenantId, translated.droppedLocales, translated.droppedFields,
    );
    if (claim) await completeContentPublish(claim, 200, updated);
    revalidateStorefrontContent(tenant.tenantId);
    return NextResponse.json(updated);
  } catch (error) {
    if (claim && !contentWritten) await releaseContentPublishClaim(claim);
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withContentEngineTenantGate(withAdminAudit(POSTHandler));
export const PUT = withContentEngineTenantGate(withAdminAudit(PUTHandler));
