// app/api/admin/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const REVIEW_STATUSES = ['all', 'pending', 'approved'] as const;

type ReviewStatus = (typeof REVIEW_STATUSES)[number];

function parsePositiveInteger(value: string | null, fallback: number, maximum?: number) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return maximum ? Math.min(parsed, maximum) : parsed;
}

// GET reviews within the authenticated EEO Network tenant scope.
export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = (searchParams.get('tenantId') || '').trim();
    const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;
    if (effectiveTenantId && !canAccessTenant(auth, effectiveTenantId)) return tenantForbiddenResponse();
    if (!effectiveTenantId && auth.tenantIds.length === 0) return tenantForbiddenResponse();

    const page = parsePositiveInteger(searchParams.get('page'), DEFAULT_PAGE);
    const limit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const requestedStatus = searchParams.get('status') || 'all';
    if (!REVIEW_STATUSES.includes(requestedStatus as ReviewStatus)) {
      return NextResponse.json(
        { success: false, message: 'Invalid review status filter' },
        { status: 400 },
      );
    }

    const status = requestedStatus as ReviewStatus;
    const tenantFilter = effectiveTenantId
      ? { tenantId: effectiveTenantId }
      : { tenantId: { $in: auth.tenantIds } };
    const statusFilter = status === 'approved'
      ? { verified: true }
      : status === 'pending'
        ? { verified: { $ne: true } }
        : {};
    const listFilter = { ...tenantFilter, ...statusFilter };
    const skip = (page - 1) * limit;

    const [reviews, filteredTotal, aggregateRows] = await Promise.all([
      Review.find(listFilter)
        .populate({ path: 'user', model: User, select: 'name email' })
        .populate({ path: 'tour', model: Tour, select: 'title tenantId' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(listFilter),
      Review.aggregate([
        { $match: tenantFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$verified', true] }, 0, 1] } },
            approved: { $sum: { $cond: [{ $eq: ['$verified', true] }, 1, 0] } },
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
    ]);

    const aggregate = aggregateRows[0] || { total: 0, pending: 0, approved: 0, avgRating: 0 };
    const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));

    return NextResponse.json({
      success: true,
      data: reviews,
      stats: {
        totalReviews: aggregate.total || 0,
        pendingReviews: aggregate.pending || 0,
        approvedReviews: aggregate.approved || 0,
        averageRating: Math.round((aggregate.avgRating || 0) * 10) / 10,
      },
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
      status,
      tenantId: effectiveTenantId || 'all',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch reviews', error: (error as Error).message },
      { status: 500 },
    );
  }
}
