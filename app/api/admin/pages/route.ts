import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import {
  canAccessTenant,
  requireAdminAuth,
  tenantForbiddenResponse,
  type AdminAuthContext,
} from '@/lib/auth/adminAuth';
import { pagePath } from '@/lib/attractionPages/pageUrl';

const MAX_LIMIT = 50;
const VALID_KINDS = ['all', 'attraction', 'category-landing', 'category'] as const;
const VALID_STATUSES = ['all', 'published', 'draft'] as const;

type PageKind = Exclude<(typeof VALID_KINDS)[number], 'all'>;

interface PagesCursor {
  c: string;
  id: string;
}

function decodeCursor(raw: string | null): PagesCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as PagesCursor;
    if (!parsed?.c || !parsed?.id || Number.isNaN(Date.parse(parsed.c))) return null;
    return Types.ObjectId.isValid(parsed.id) ? parsed : null;
  } catch {
    return null;
  }
}

function encodeCursor(cursor: PagesCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cursorFilter(cursor: PagesCursor | null): Record<string, unknown> {
  if (!cursor) return {};
  const createdAt = new Date(cursor.c);
  return {
    $or: [
      { createdAt: { $lt: createdAt } },
      { createdAt, _id: { $lt: new Types.ObjectId(cursor.id) } },
    ],
  };
}

function tenantScope(
  auth: AdminAuthContext,
  requestedTenantId: string | null,
): Record<string, unknown> | NextResponse {
  if (requestedTenantId && requestedTenantId !== 'all') {
    if (!canAccessTenant(auth, requestedTenantId)) return tenantForbiddenResponse();
    return { tenantId: requestedTenantId };
  }
  if (auth.role === 'super_admin') return {};
  return { tenantId: { $in: auth.tenantIds } };
}

function createdAtIso(record: Record<string, unknown>): string {
  const value = new Date(record.createdAt as string | number | Date);
  if (!Number.isNaN(value.getTime())) return value.toISOString();
  const id = String(record._id || '');
  return Types.ObjectId.isValid(id)
    ? new Types.ObjectId(id).getTimestamp().toISOString()
    : new Date(0).toISOString();
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const kind = searchParams.get('kind') || 'all';
  const status = searchParams.get('status') || 'all';
  if (!VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
    return NextResponse.json({ success: false, error: 'Invalid page type filter' }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json({ success: false, error: 'Invalid status filter' }, { status: 400 });
  }

  const rawCursor = searchParams.get('cursor');
  const cursor = decodeCursor(rawCursor);
  if (rawCursor && !cursor) {
    return NextResponse.json({ success: false, error: 'Invalid pagination cursor' }, { status: 400 });
  }

  const scope = tenantScope(auth, searchParams.get('tenantId'));
  if (scope instanceof NextResponse) return scope;

  try {
    await dbConnect();

    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit')) || 20));
    const search = q ? new RegExp(escapeRegex(q), 'i') : null;
    const pageKind = kind as (typeof VALID_KINDS)[number];
    const wantPages = pageKind !== 'category';
    const wantCategories = pageKind === 'all' || pageKind === 'category';

    const attractionFilter: Record<string, unknown> = {
      ...scope,
      ...cursorFilter(cursor),
    };
    if (pageKind === 'attraction') attractionFilter.pageType = 'attraction';
    if (pageKind === 'category-landing') attractionFilter.pageType = 'category';
    if (status === 'published') attractionFilter.isPublished = true;
    if (status === 'draft') attractionFilter.isPublished = { $ne: true };
    if (search) attractionFilter.$and = [{ $or: [{ title: search }, { slug: search }] }];

    const categoryFilter: Record<string, unknown> = {
      ...scope,
      ...cursorFilter(cursor),
    };
    if (status === 'published') categoryFilter.isPublished = { $ne: false };
    if (status === 'draft') categoryFilter.isPublished = false;
    if (search) categoryFilter.$and = [{ $or: [{ name: search }, { slug: search }] }];

    const fetchSize = limit + 1;
    const [pages, categories] = await Promise.all([
      wantPages
        ? AttractionPage.find(attractionFilter)
            .select('tenantId title slug description heroImage pageType urlType isPublished featured createdAt')
            .sort({ createdAt: -1, _id: -1 })
            .limit(fetchSize)
            .lean()
        : [],
      wantCategories
        ? Category.find(categoryFilter)
            .select('tenantId name slug description heroImage isPublished featured createdAt')
            .sort({ createdAt: -1, _id: -1 })
            .limit(fetchSize)
            .lean()
        : [],
    ]);

    const rows = [
      ...(pages as Array<Record<string, unknown>>).map((page) => {
        const isLanding = page.pageType === 'category';
        return {
          id: String(page._id),
          tenantId: String(page.tenantId || ''),
          kind: (isLanding ? 'category-landing' : 'attraction') as PageKind,
          title: String(page.title || ''),
          slug: String(page.slug || ''),
          description: page.description ? String(page.description) : undefined,
          image: page.heroImage ? String(page.heroImage) : undefined,
          urlType: String(page.urlType || 'default'),
          publicPath: pagePath(
            String(page.slug || ''),
            isLanding ? 'category' : 'attraction',
            page.urlType as string | undefined,
          ),
          editHref: `/admin/attraction-pages/${String(page._id)}/edit`,
          isPublished: page.isPublished === true,
          featured: page.featured === true,
          createdAt: createdAtIso(page),
        };
      }),
      ...(categories as Array<Record<string, unknown>>).map((category) => ({
        id: String(category._id),
        tenantId: String(category.tenantId || ''),
        kind: 'category' as const,
        title: String(category.name || ''),
        slug: String(category.slug || ''),
        description: category.description ? String(category.description) : undefined,
        image: category.heroImage ? String(category.heroImage) : undefined,
        urlType: 'categories',
        publicPath: `/categories/${String(category.slug || '')}`,
        editHref: `/admin/categories/${String(category._id)}/edit`,
        isPublished: category.isPublished !== false,
        featured: category.featured === true,
        createdAt: createdAtIso(category),
      })),
    ].sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });

    const data = rows.slice(0, limit);
    const last = data[data.length - 1];
    const nextCursor = rows.length > limit && last
      ? encodeCursor({ c: last.createdAt, id: last.id })
      : null;

    const [attraction, categoryLanding, category] = await Promise.all([
      AttractionPage.countDocuments({ ...scope, pageType: 'attraction' }),
      AttractionPage.countDocuments({ ...scope, pageType: 'category' }),
      Category.countDocuments(scope),
    ]);

    return NextResponse.json({
      success: true,
      data,
      nextCursor,
      counts: {
        attraction,
        'category-landing': categoryLanding,
        category,
        total: attraction + categoryLanding + category,
      },
    });
  } catch (error) {
    console.error('Unified pages list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load pages' }, { status: 500 });
  }
}
