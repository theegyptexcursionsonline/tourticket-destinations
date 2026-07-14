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
    tourTenantFilter.tenantId = effectiveTenantId;
    bookingTenantFilter.tenantId = effectiveTenantId;
  } else {
    tourTenantFilter.tenantId = { $in: tenantScopeIds };
    bookingTenantFilter.tenantId = { $in: tenantScopeIds };
  }

  // Revenue = collected money only; cancelled/refunded bookings are excluded.
  const revenueMatch: Record<string, unknown> = {
    ...bookingTenantFilter,
    status: { $nin: ['cancelled', 'Cancelled', 'refunded', 'Refunded', 'partial_refunded'] },
  };

  await Promise.race([
    dbConnect(effectiveTenantId || undefined),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 10000))
  ]);

  // Fire the month-over-month trend queries concurrently with the main stats
  // batch below (one DB round-trip instead of two). Docs are dated by their
  // _id timestamp, present on every document.
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const cutoffId = mongoose.Types.ObjectId.createFromTime(Math.floor(oneMonthAgo.getTime() / 1000));
  const revStatus = { $nin: ['cancelled', 'Cancelled', 'refunded', 'Refunded', 'partial_refunded'] };
  const trendsPromise = Promise.all([
    Booking.countDocuments({ ...bookingTenantFilter, _id: { $lt: cutoffId } }),
    Booking.aggregate([{ $match: { ...bookingTenantFilter, status: revStatus, _id: { $lt: cutoffId } } }, { $group: { _id: null, s: { $sum: '$totalPrice' } } }]),
    Tour.countDocuments({ isPublished: true, ...tourTenantFilter, _id: { $lt: cutoffId } }),
    Booking.aggregate([{ $match: { ...bookingTenantFilter, _id: { $lt: cutoffId } } }, { $group: { _id: '$user' } }, { $count: 'count' }]),
  ]).catch(() => [0, [] as any[], 0, [] as any[]] as const);

  const [
    totalTours,
    totalBookings,
    totalUsers,
    revenueResult,
    recentBookingsCount,
    recentBookings
  ] = await Promise.allSettled([
    Tour.countDocuments({ isPublished: true, ...tourTenantFilter }),
    Booking.countDocuments(bookingTenantFilter),
    // Customers aren't tenant-tagged (User has no tenantId), so count distinct
    // customers who have a booking in scope — the meaningful per-brand figure.
    Booking.aggregate([
      { $match: bookingTenantFilter },
      { $group: { _id: '$user' } },
      { $count: 'count' },
    ]),
    Booking.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
    ]),
    (async () => {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
      return await Booking.countDocuments({
        createdAt: { $gte: twentyFourHoursAgo },
        ...bookingTenantFilter,
      });
    })(),
    Booking.find(bookingTenantFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'tour', model: Tour, select: 'title' })
      .populate({ path: 'user', model: User, select: 'firstName lastName email' })
      .lean()
  ]);

  const stats = {
    totalTours: totalTours.status === 'fulfilled' ? totalTours.value : 0,
    totalBookings: totalBookings.status === 'fulfilled' ? totalBookings.value : 0,
    totalUsers: totalUsers.status === 'fulfilled' && totalUsers.value.length > 0
      ? (totalUsers.value[0].count || 0)
      : 0,
    totalRevenue: revenueResult.status === 'fulfilled' && revenueResult.value.length > 0
      ? revenueResult.value[0].totalRevenue || 0
      : 0,
    recentBookingsCount: recentBookingsCount.status === 'fulfilled' ? recentBookingsCount.value : 0,
  };

  const recentActivities = recentBookings.status === 'fulfilled'
    ? recentBookings.value
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
        })
    : [];

  // Trend queries were fired concurrently above — resolve them now.
  const [pB, pRAgg, pT, pUAgg] = await trendsPromise;
  const prevRevenue = Array.isArray(pRAgg) && pRAgg[0] ? (pRAgg[0].s || 0) : 0;
  const prevUsers = Array.isArray(pUAgg) && pUAgg[0] ? (pUAgg[0].count || 0) : 0;
  const trendOf = (cur: number, prev: number) => ({
    value: Math.round(prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0)),
    isPositive: cur >= prev,
  });
  const trends = {
    bookings: trendOf(stats.totalBookings, pB as number),
    revenue: trendOf(stats.totalRevenue, prevRevenue),
    tours: trendOf(stats.totalTours, pT as number),
    users: trendOf(stats.totalUsers, prevUsers),
  };

  return { ...stats, trends, recentActivities };
}

function getCachedDashboardStats(tenantKey: string, tenantScopeIds: string[]) {
  const scopeKey = tenantScopeIds.slice().sort().join(',');
  return cacheIfAvailable(
    () => fetchDashboardStats(tenantKey === 'all' ? undefined : tenantKey, tenantScopeIds),
    [`dashboard-stats-${tenantKey}-${scopeKey}`],
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
