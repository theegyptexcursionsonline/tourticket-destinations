import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import {
  canAccessTenant,
  requireAdminAuth,
  tenantForbiddenResponse,
  type AdminAuthContext,
} from '@/lib/auth/adminAuth';

const LIMIT = 20;
const VALID_KINDS = ['tours', 'pages', 'categories'] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tenantScope(
  auth: AdminAuthContext,
  tenantId: string | null,
): Record<string, unknown> | NextResponse {
  if (tenantId && tenantId !== 'all') {
    if (!canAccessTenant(auth, tenantId)) return tenantForbiddenResponse();
    return { tenantId };
  }
  if (auth.role === 'super_admin') return {};
  return { tenantId: { $in: auth.tenantIds } };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const kind = searchParams.get('kind') || 'tours';
  if (!VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
    return NextResponse.json({ success: false, error: 'Unknown option type' }, { status: 400 });
  }

  const scope = tenantScope(auth, searchParams.get('tenantId'));
  if (scope instanceof NextResponse) return scope;

  try {
    await dbConnect();
    const q = (searchParams.get('q') || '').trim();
    const search = q ? new RegExp(escapeRegex(q), 'i') : null;
    const excludeId = searchParams.get('excludeId');
    const ids = (searchParams.get('ids') || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => Types.ObjectId.isValid(id))
      .slice(0, 100);
    const explicitIds = ids.length > 0;

    if (kind === 'tours') {
      const filter: Record<string, unknown> = { ...scope };
      if (explicitIds) filter._id = { $in: ids };
      else if (search) filter.$or = [{ title: search }, { slug: search }];
      const tours = await Tour.find(filter)
        .select('tenantId title slug image isPublished')
        .sort({ isFeatured: -1, rating: -1 })
        .limit(explicitIds ? ids.length : LIMIT)
        .lean();
      return NextResponse.json({
        success: true,
        data: (tours as Array<Record<string, unknown>>).map((tour) => ({
          id: String(tour._id),
          tenantId: String(tour.tenantId || ''),
          title: String(tour.title || ''),
          slug: String(tour.slug || ''),
          image: tour.image ? String(tour.image) : undefined,
          isPublished: tour.isPublished === true,
        })),
      });
    }

    if (kind === 'categories') {
      const filter: Record<string, unknown> = { ...scope };
      if (explicitIds) filter._id = { $in: ids };
      else if (search) filter.$or = [{ name: search }, { slug: search }];
      const categories = await Category.find(filter)
        .select('tenantId name slug heroImage isPublished')
        .sort({ order: 1, name: 1 })
        .limit(explicitIds ? ids.length : 100)
        .lean();
      return NextResponse.json({
        success: true,
        data: (categories as Array<Record<string, unknown>>).map((category) => ({
          id: String(category._id),
          _id: String(category._id),
          tenantId: String(category.tenantId || ''),
          title: String(category.name || ''),
          name: String(category.name || ''),
          slug: String(category.slug || ''),
          image: category.heroImage ? String(category.heroImage) : undefined,
          kind: 'category',
          isPublished: category.isPublished !== false,
        })),
      });
    }

    const pageFilter: Record<string, unknown> = { ...scope };
    const categoryFilter: Record<string, unknown> = { ...scope };
    if (excludeId && Types.ObjectId.isValid(excludeId)) pageFilter._id = { $ne: excludeId };
    if (explicitIds) {
      pageFilter._id = excludeId && Types.ObjectId.isValid(excludeId)
        ? { $in: ids, $ne: excludeId }
        : { $in: ids };
      categoryFilter._id = { $in: ids };
    } else if (search) {
      pageFilter.$or = [{ title: search }, { slug: search }];
      categoryFilter.$or = [{ name: search }, { slug: search }];
    }

    const [pages, categories] = await Promise.all([
      AttractionPage.find(pageFilter)
        .select('tenantId title slug heroImage pageType isPublished')
        .sort({ createdAt: -1 })
        .limit(explicitIds ? ids.length : LIMIT)
        .lean(),
      Category.find(categoryFilter)
        .select('tenantId name slug heroImage isPublished')
        .sort({ createdAt: -1 })
        .limit(explicitIds ? ids.length : LIMIT)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: [
        ...(pages as Array<Record<string, unknown>>).map((page) => ({
          id: String(page._id),
          tenantId: String(page.tenantId || ''),
          title: String(page.title || ''),
          slug: String(page.slug || ''),
          image: page.heroImage ? String(page.heroImage) : undefined,
          kind: page.pageType === 'category' ? 'category-landing' : 'attraction',
          isPublished: page.isPublished === true,
        })),
        ...(categories as Array<Record<string, unknown>>).map((category) => ({
          id: String(category._id),
          tenantId: String(category.tenantId || ''),
          title: String(category.name || ''),
          slug: String(category.slug || ''),
          image: category.heroImage ? String(category.heroImage) : undefined,
          kind: 'category',
          isPublished: category.isPublished !== false,
        })),
      ],
    });
  } catch (error) {
    console.error('Pages options error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load options' }, { status: 500 });
  }
}
