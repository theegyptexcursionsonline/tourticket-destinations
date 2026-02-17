// app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request, {
      permissions: ['manageDashboard'],
      requireAll: false
    });
    
    // If auth failed, authResult is a NextResponse error
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Get tenant filter from query params
    const { searchParams } = new URL(request.url);
    const tenantId =
      searchParams.get('tenantId') ||
      searchParams.get('brandId') ||
      searchParams.get('brand_id');
    const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;
    
    // Build strict tenant filters
    // Tours: include selected tenant + 'default' (shared tours visible to all tenants)
    // Bookings: strict match — only bookings that belong to this tenant
    const tourTenantFilter: Record<string, unknown> = {};
    const bookingTenantFilter: Record<string, unknown> = {};
    if (effectiveTenantId) {
      tourTenantFilter.tenantId = effectiveTenantId !== 'default'
        ? { $in: [effectiveTenantId, 'default'] }
        : effectiveTenantId;
      bookingTenantFilter.tenantId = effectiveTenantId;
    }

    // Connect to database with timeout
    const _dbConnection = await Promise.race([
      dbConnect(effectiveTenantId || undefined),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 10000))
    ]);

    // Fetch all stats in parallel with error handling for each
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

    // Extract values with fallbacks
    const stats = {
      totalTours: totalTours.status === 'fulfilled' ? totalTours.value : 0,
      totalBookings: totalBookings.status === 'fulfilled' ? totalBookings.value : 0,
      totalUsers: totalUsers.status === 'fulfilled' ? totalUsers.value : 0,
      totalRevenue: revenueResult.status === 'fulfilled' && revenueResult.value.length > 0 
        ? revenueResult.value[0].totalRevenue || 0 
        : 0,
      recentBookingsCount: recentBookingsCount.status === 'fulfilled' ? recentBookingsCount.value : 0,
    };

    // Process recent activities with error handling
    const recentActivities = recentBookings.status === 'fulfilled'
      ? recentBookings.value
          .filter((booking: any) => booking && booking.tour && booking.user) // Filter out null references
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
            } catch (err) {
              console.error('Error processing booking activity:', err);
              return {
                id: booking._id.toString(),
                text: 'New booking received',
              };
            }
          })
      : [];

    const responseData = {
      ...stats,
      recentActivities,
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Dashboard API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
    
    // Return partial data instead of complete failure
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