// app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { cacheIfAvailable } from '@/lib/cache';
import Tour from '@/lib/models/Tour';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

async function fetchDashboardStats(
  effectiveTenantId: string | undefined,
  tenantScopeIds: string[],
) {
  const tourTenantFilter: Record<string, unknown> = {};
  const bookingTenantFilter: Record<string, unknown> = {};
  if (effectiveTenantId) {
    // A specific brand: its OWN data only. Never fold in the EEO 'default'
    // (main-site) tenant, even as a tour fallback, on this brands admin.
    tourTenantFilter.$or = [
      { tenantId: effectiveTenantId },
      { tenantIds: effectiveTenantId },
    ];
    bookingTenantFilter.tenantId = effectiveTenantId;
  } else {
    tourTenantFilter.tenantId = { $in: tenantScopeIds };
    bookingTenantFilter.tenantId = { $in: tenantScopeIds };
  }

  await Promise.race([
    dbConnect(effectiveTenantId || undefined),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 10000))
  ]);

  // Docs are dated by their _id timestamp, present on every document.
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const cutoffId = mongoose.Types.ObjectId.createFromTime(Math.floor(oneMonthAgo.getTime() / 1000));
  const revStatus = { $nin: ['cancelled', 'Cancelled', 'refunded', 'Refunded', 'partial_refunded'] };
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

  // A booking is visible only when its own tenant and its linked tour agree.
  // This is the same isolation rule used by the bookings list and reports, so
  // legacy cross-tenant references cannot inflate dashboard totals/revenue.
  const bookingTourScopeStages = effectiveTenantId
    ? [
        {
          $match: {
            $or: [
              { 'tourDetails.tenantId': effectiveTenantId },
              { 'tourDetails.tenantIds': effectiveTenantId },
            ],
          },
        },
      ]
    : [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ['$tourDetails.tenantId', '$tenantId'] },
                {
                  $in: [
                    '$tenantId',
                    { $ifNull: ['$tourDetails.tenantIds', []] },
                  ],
                },
              ],
            },
          },
        },
      ];

  const [tourStats, bookingStats] = await Promise.allSettled([
    Promise.all([
      Tour.countDocuments({ isPublished: true, ...tourTenantFilter }),
      Tour.countDocuments({ isPublished: true, ...tourTenantFilter, _id: { $lt: cutoffId } }),
    ]),
    Booking.aggregate([
      { $match: bookingTenantFilter },
      {
        $lookup: {
          from: Tour.collection.name,
          localField: 'tour',
          foreignField: '_id',
          as: 'tourDetails',
        },
      },
      { $unwind: { path: '$tourDetails', preserveNullAndEmptyArrays: true } },
      ...bookingTourScopeStages,
      {
        $facet: {
          totalBookings: [{ $count: 'count' }],
          totalUsers: [{ $group: { _id: '$user' } }, { $count: 'count' }],
          revenue: [
            { $match: { status: revStatus } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
          ],
          recentBookingsCount: [
            { $match: { createdAt: { $gte: twentyFourHoursAgo } } },
            { $count: 'count' },
          ],
          recentBookingIds: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { _id: 1 } },
          ],
          previousBookings: [
            { $match: { _id: { $lt: cutoffId } } },
            { $count: 'count' },
          ],
          previousRevenue: [
            { $match: { status: revStatus, _id: { $lt: cutoffId } } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
          ],
          previousUsers: [
            { $match: { _id: { $lt: cutoffId } } },
            { $group: { _id: '$user' } },
            { $count: 'count' },
          ],
        },
      },
    ]).allowDiskUse(true),
  ]);

  const [currentTours, previousTours] = tourStats.status === 'fulfilled'
    ? tourStats.value
    : [0, 0];
  const bookingFacet = bookingStats.status === 'fulfilled' ? bookingStats.value[0] : undefined;
  const recentBookingIds = bookingFacet?.recentBookingIds?.map((row: { _id: mongoose.Types.ObjectId }) => row._id) || [];
  const recentBookingRows = recentBookingIds.length > 0
    ? await Booking.find({ _id: { $in: recentBookingIds } })
        .populate({ path: 'tour', model: Tour, select: 'title' })
        .populate({ path: 'user', model: User, select: 'firstName lastName email' })
        .lean()
    : [];
  const recentBookingOrder = new Map<string, number>(
    recentBookingIds.map((id: mongoose.Types.ObjectId, index: number) => [id.toString(), index]),
  );
  const recentBookings = recentBookingRows.sort(
    (left, right) =>
      (recentBookingOrder.get(left._id.toString()) ?? 0) -
      (recentBookingOrder.get(right._id.toString()) ?? 0),
  );

  const stats = {
    totalTours: currentTours,
    totalBookings: bookingFacet?.totalBookings?.[0]?.count || 0,
    totalUsers: bookingFacet?.totalUsers?.[0]?.count || 0,
    totalRevenue: bookingFacet?.revenue?.[0]?.totalRevenue || 0,
    recentBookingsCount: bookingFacet?.recentBookingsCount?.[0]?.count || 0,
  };

  const recentActivities = recentBookings
        .filter((booking: any) => booking && booking.tour && booking.user)
        .map((booking: any) => {
          try {
            const tourTitle = booking.tour?.title || 'Unknown Tour';
            const userName = booking.user
              ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || booking.user.email || 'Unknown User'
              : 'Unknown User';
            return {
              id: booking._id.toString(),
              text: `New booking for "${tourTitle}" by ${userName}`,
              createdAt: booking.createdAt || booking._id.getTimestamp(),
            };
          } catch {
            return {
              id: booking._id.toString(),
              text: 'New booking received',
              createdAt: booking.createdAt || booking._id.getTimestamp(),
            };
          }
        });

  const previousBookings = bookingFacet?.previousBookings?.[0]?.count || 0;
  const previousRevenue = bookingFacet?.previousRevenue?.[0]?.totalRevenue || 0;
  const previousUsers = bookingFacet?.previousUsers?.[0]?.count || 0;
  const trendOf = (cur: number, prev: number) => ({
    value: Math.round(prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0)),
    isPositive: cur >= prev,
  });
  const trends = {
    bookings: trendOf(stats.totalBookings, previousBookings),
    revenue: trendOf(stats.totalRevenue, previousRevenue),
    tours: trendOf(stats.totalTours, previousTours),
    users: trendOf(stats.totalUsers, previousUsers),
  };

  return { ...stats, trends, recentActivities };
}

function getCachedDashboardStats(tenantKey: string, tenantScopeIds: string[]) {
  const scopeKey = tenantScopeIds.slice().sort().join(',');
  return cacheIfAvailable(
    () => fetchDashboardStats(tenantKey === 'all' ? undefined : tenantKey, tenantScopeIds),
    [`dashboard-stats-tenant-safe-v2-${tenantKey}-${scopeKey}`],
    { revalidate: 60, tags: ['dashboard', `dashboard-${tenantKey}`] }
  )();
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request, {
      permissions: ['manageDashboard'],
      requireAll: false
    });
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const tenantId =
      searchParams.get('tenantId') ||
      searchParams.get('brandId') ||
      searchParams.get('brand_id');
    const tenantKey = tenantId && tenantId !== 'all' ? tenantId : 'all';
    if (tenantKey !== 'all' && !canAccessTenant(authResult, tenantKey)) return tenantForbiddenResponse();
    if (tenantKey === 'all' && authResult.tenantIds.length === 0) return tenantForbiddenResponse();

    const tenantScopeIds = tenantKey === 'all' ? authResult.tenantIds : [tenantKey];
    const responseData = await getCachedDashboardStats(tenantKey, tenantScopeIds);

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Dashboard API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';

    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: {
        totalTours: 0,
        totalBookings: 0,
        totalUsers: 0,
        totalRevenue: 0,
        recentBookingsCount: 0,
        recentActivities: []
      }
    }, { status: 500 });
  }
}
