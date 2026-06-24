// app/api/admin/content/blog/route.ts
// Adapter route for the foxes-content-engine (multi-tenant network).
// Auth: Bearer token in Authorization header (CONTENT_ENGINE_API_KEY).
// POST creates a new blog post for the engine-supplied tenant; PUT updates by
// (tenant, slug). Blogs are tenant-scoped, so the same slug may exist per tenant.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Blog from "@/lib/models/Blog";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";

const BLOG_CATEGORIES = new Set([
  "travel-tips",
  "destination-guides",
  "food-culture",
  "adventure",
  "budget-travel",
  "luxury-travel",
  "solo-travel",
  "family-travel",
  "photography",
  "local-insights",
  "seasonal-travel",
  "transportation",
  "accommodation",
  "news-updates",
]);

// Primary domain per tenant — used to build the live URL the engine pings/reports.
const TENANT_DOMAIN: Record<string, string> = {
  default: "egypt-excursionsonline.com",
  "hurghada-excursions-online": "hurghadaexcursionsonline.com",
  "cairo-excursions-online": "cairoexcursionsonline.com",
  "makadi-bay": "makadibayexcursions.com",
  "el-gouna": "elgounaexcursions.com",
  "luxor-excursions": "luxorexcursions.com",
  "sharm-excursions-online": "sharmexcursionsonline.com",
  "aswan-excursions": "aswanexcursions.com",
  "marsa-alam-excursions": "marsaalamexcursions.com",
  "dahab-excursions": "dahabexcursions.com",
};

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
  tenantId?: string;
  payload?: IncomingPayload;
  translations?: Record<string, Record<string, unknown>>;
};

function sanitizeFaqs(input: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((f) => {
      const o = (f ?? {}) as { question?: unknown; answer?: unknown };
      return {
        question: typeof o.question === "string" ? o.question.trim() : "",
        answer: typeof o.answer === "string" ? o.answer.trim() : "",
      };
    })
    .filter((f) => f.question.length > 0 && f.answer.length > 0)
    .slice(0, 10);
}

function liveUrlForBlog(slug: string, tenantId: string): string {
  const host = TENANT_DOMAIN[tenantId] ?? "egypt-excursionsonline.com";
  const locale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en";
  return `https://${host}/${locale}/blog/${slug}`;
}

function validate(payload: IncomingPayload | undefined): string | null {
  if (!payload) return "payload is required";
  if (!payload.title || payload.title.length < 5) return "title must be >= 5 chars";
  if (!payload.slug) return "slug is required";
  if (!/^[a-z0-9-]+$/.test(payload.slug)) {
    return "slug must contain only lowercase letters, numbers, and hyphens";
  }
  if (!payload.excerpt || payload.excerpt.length < 10) return "excerpt must be >= 10 chars";
  if (!payload.content || payload.content.length < 100) return "content must be >= 100 chars";
  if (!payload.category || !BLOG_CATEGORIES.has(payload.category)) {
    return `category must be one of: ${[...BLOG_CATEGORIES].join(", ")}`;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const error = validate(body.payload);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const payload = body.payload!;
  const tenantId = body.tenantId?.trim() || "default";

  await dbConnect();

  const existing = await Blog.findOne({ slug: payload.slug, tenantId });
  if (existing) {
    return NextResponse.json(
      { error: `A blog post with slug "${payload.slug}" already exists for this tenant`, existingId: String(existing._id) },
      { status: 409 },
    );
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).slice(0, 10)
    : [];

  try {
    const doc = await Blog.create({
      tenantId,
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      content: payload.content,
      category: payload.category,
      tags,
      faqs: sanitizeFaqs(payload.faqs),
      author: payload.author?.trim() || "EEO Editorial Team",
      featuredImage:
        payload.featuredImage ??
        "https://res.cloudinary.com/dm3sxllch/image/upload/v1781977478/foxes-content-engine/heroes/loxyoywr6qhln7dnpaig.jpg",
      metaTitle: payload.metaTitle,
      metaDescription: payload.metaDescription,
      readTime: payload.readTime,
      status: payload.status === "draft" ? "draft" : "published",
      featured: payload.featured === true,
    });

    return NextResponse.json(
      { id: String(doc._id), slug: doc.slug, liveUrl: liveUrlForBlog(doc.slug, tenantId) },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const error = validate(body.payload);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const payload = body.payload!;
  const tenantId = body.tenantId?.trim() || "default";

  await dbConnect();

  const existing = await Blog.findOne({ slug: payload.slug, tenantId });
  if (!existing) {
    return NextResponse.json({ error: `No blog post with slug "${payload.slug}" for this tenant` }, { status: 404 });
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).slice(0, 10)
    : existing.tags;

  existing.title = payload.title!;
  existing.excerpt = payload.excerpt!;
  existing.content = payload.content!;
  existing.category = payload.category!;
  existing.tags = tags;
  if (Array.isArray(payload.faqs)) existing.faqs = sanitizeFaqs(payload.faqs);
  if (payload.metaTitle) existing.metaTitle = payload.metaTitle;
  if (payload.metaDescription) existing.metaDescription = payload.metaDescription;
  if (payload.featuredImage) existing.featuredImage = payload.featuredImage;
  if (payload.author) existing.author = payload.author;
  if (typeof payload.featured === "boolean") existing.featured = payload.featured;

  try {
    await existing.save();
    return NextResponse.json({ id: String(existing._id), slug: existing.slug, liveUrl: liveUrlForBlog(existing.slug, tenantId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
