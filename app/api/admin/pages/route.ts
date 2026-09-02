// Unified "Pages" admin list: attraction/landing pages (AttractionPage) and
// categories (Category) in one cursor-paginated feed. The two collections stay
// separate models; this endpoint only unifies management.
//
// Sorting runs as an aggregation over a computed sort value (see
// lib/admin/pagesListSort) so rows without createdAt/updatedAt still page
// correctly and the tail stays reachable under both "Newest" and
// "Last modified". The tenant scope is the first $match of every pipeline.
import { NextRequest, NextResponse } from 'next/server';
import { Types, type PipelineStage } from 'mongoose';
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
import { combinePageFilters } from '@/lib/admin/pageFilters';
import {
  buildPagesCursorFilter,
  buildSortValueStage,
  resolvePagesSortKey,
  SORT_VALUE_FIELD,
  type PagesCursor,
  type PagesSortKey,
} from '@/lib/admin/pagesListSort';

const MAX_LIMIT = 50;
const VALID_KINDS = ['all', 'attraction', 'category-landing', 'category'] as const;
const VALID_STATUSES = ['all', 'published', 'draft', 'archived'] as const;

type PageKind = Exclude<(typeof VALID_KINDS)[number], 'all'>;

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

// Legacy docs can predate timestamps, and `new Date(undefined)` throws on
// .toISOString() — which would take the whole list down with a 500 rather
// than dropping one date cell. Fall back to the ObjectId's embedded timestamp.
function isoStamp(value: unknown, fallbackId: unknown): string {
  if (value) {
    const parsed = new Date(value as string | number | Date);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const id = String(fallbackId || '');
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
    if (q.length > 100) {
      return NextResponse.json({ success: false, error: 'Search is too long' }, { status: 400 });
    }
    const editor = (searchParams.get('editor') || '').trim();
    if (editor.length > 100) {
      return NextResponse.json({ success: false, error: 'Editor filter is too long' }, { status: 400 });
    }
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit')) || 20));
    const sortKey: PagesSortKey = resolvePagesSortKey(searchParams.get('sort'));
    const search = q ? new RegExp(escapeRegex(q), 'i') : null;
    const editorSearch = editor ? new RegExp(escapeRegex(editor), 'i') : null;
    const editorFilter = editorSearch ? {
      $or: [
        { 'createdBy.name': editorSearch },
        { 'createdBy.email': editorSearch },
        { 'updatedBy.name': editorSearch },
        { 'updatedBy.email': editorSearch },
      ],
    } : {};
    const pageKind = kind as (typeof VALID_KINDS)[number];
    const wantPages = pageKind !== 'category';
    const wantCategories = pageKind === 'all' || pageKind === 'category';

    const attractionTypeFilter: Record<string, unknown> = {};
    if (pageKind === 'attraction') attractionTypeFilter.pageType = 'attraction';
    if (pageKind === 'category-landing') attractionTypeFilter.pageType = 'category';
    if (status === 'published') attractionTypeFilter.isPublished = true;
    if (status === 'draft') attractionTypeFilter.isPublished = { $ne: true };
    // Archived rows are hidden everywhere except their own filter, which is
    // the point of archiving: they stop cluttering the working lists.
    if (status === 'archived') attractionTypeFilter.archivedAt = { $ne: null };
    else attractionTypeFilter.archivedAt = null;
    // The tenant scope is always the first clause; search and editor filters
    // are appended, never substituted, so they can never widen the scope.
    const attractionFilter = combinePageFilters(
      scope,
      attractionTypeFilter,
      search ? { $or: [{ title: search }, { slug: search }] } : {},
      editorFilter,
    );

    const categoryStatusFilter: Record<string, unknown> = {};
    if (status === 'published') categoryStatusFilter.isPublished = { $ne: false };
    if (status === 'draft') categoryStatusFilter.isPublished = false;
    if (status === 'archived') categoryStatusFilter.archivedAt = { $ne: null };
    else categoryStatusFilter.archivedAt = null;
    const categoryFilter = combinePageFilters(
      scope,
      categoryStatusFilter,
      search ? { $or: [{ name: search }, { slug: search }] } : {},
      editorFilter,
    );

    const fetchSize = limit + 1;
    const cursorMatch = buildPagesCursorFilter(cursor, (id) => new Types.ObjectId(id));

    // The cursor is applied after $addFields so it compares against the
    // computed sort value, not the (sometimes absent) raw timestamp.
    const pipeline = (match: Record<string, unknown>, project: Record<string, 1>): PipelineStage[] => [
      { $match: match },
      buildSortValueStage(sortKey) as unknown as PipelineStage,
      ...(Object.keys(cursorMatch).length > 0 ? [{ $match: cursorMatch } as PipelineStage] : []),
      { $sort: { [SORT_VALUE_FIELD]: -1, _id: -1 } },
      { $limit: fetchSize },
      { $project: { ...project, [SORT_VALUE_FIELD]: 1 } },
    ];

    const [pages, categories] = await Promise.all([
      wantPages
        ? AttractionPage.aggregate(
            pipeline(attractionFilter, {
              tenantId: 1, title: 1, slug: 1, description: 1, heroImage: 1, pageType: 1,
              urlType: 1, parentPage: 1, isPublished: 1, featured: 1, createdAt: 1, updatedAt: 1,
              createdBy: 1, updatedBy: 1,
            })
          )
        : [],
      wantCategories
        ? Category.aggregate(
            pipeline(categoryFilter, {
              tenantId: 1, name: 1, slug: 1, description: 1, heroImage: 1,
              isPublished: 1, featured: 1, createdAt: 1, updatedAt: 1,
              createdBy: 1, updatedBy: 1,
            })
          )
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
            null,
            typeof page.parentPage === 'object' && page.parentPage
              ? String((page.parentPage as Record<string, unknown>).slug || '')
              : undefined,
          ),
          editHref: `/admin/attraction-pages/${String(page._id)}/edit`,
          isPublished: page.isPublished === true,
          featured: page.featured === true,
          createdAt: isoStamp(page.createdAt, page._id),
          updatedAt: isoStamp(page.updatedAt || page.createdAt, page._id),
          sortValue: isoStamp(page[SORT_VALUE_FIELD], page._id),
          createdBy: page.createdBy,
          updatedBy: page.updatedBy,
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
        createdAt: isoStamp(category.createdAt, category._id),
        updatedAt: isoStamp(category.updatedAt || category.createdAt, category._id),
        sortValue: isoStamp(category[SORT_VALUE_FIELD], category._id),
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      })),
    ].sort((a, b) => {
      // Merge the two model streams on the same computed value the DB sorted by.
      if (a.sortValue !== b.sortValue) return a.sortValue < b.sortValue ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });

    const data = rows.slice(0, limit);
    const last = data[data.length - 1];
    const nextCursor = rows.length > limit && last
      ? encodeCursor({ c: last.sortValue, id: last.id })
      : null;

    const [attraction, categoryLanding, category] = await Promise.all([
      AttractionPage.countDocuments({ ...scope, pageType: 'attraction', archivedAt: null }),
      AttractionPage.countDocuments({ ...scope, pageType: 'category', archivedAt: null }),
      Category.countDocuments({ ...scope, archivedAt: null }),
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
