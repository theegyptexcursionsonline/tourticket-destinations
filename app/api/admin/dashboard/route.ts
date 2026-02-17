// app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchDashboardStats(effectiveTenantId: string | undefined) {
  const tourTenantFilter: Record<string, unknown> = {};
  const bookingTenantFilter: Record<string, unknown> = {};
  if (effectiveTenantId) {
    tourTenantFilter.tenantId = effectiveTenantId !== 'default'
      ? { $in: [effectiveTenantId, 'default'] }
      : effectiveTenantId;
    bookingTenantFilter.tenantId = effectiveTenantId;
  }

  await Promise.race([
    dbConnect(effectiveTenantId || undefined),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 10000))
  ]);

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
    User.countDocuments(bookingTenantFilter.tenantId ? bookingTenantFilter : {}),
    Booking.aggregate([
      { $match: bookingTenantFilter },
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
    totalUsers: totalUsers.status === 'fulfilled' ? totalUsers.value : 0,
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
            };
          } catch {
            return {
              id: booking._id.toString(),
              text: 'New booking received',
            };
          }
        })
    : [];

  return { ...stats, recentActivities };
}

function getCachedDashboardStats(tenantKey: string) {
  return unstable_cache(
    () => fetchDashboardStats(tenantKey === 'all' ? undefined : tenantKey),
    [`dashboard-stats-${tenantKey}`],
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

    const responseData = await getCachedDashboardStats(tenantKey);

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