// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { subMonths, format, startOfMonth } from 'date-fns';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

const VALID_STATUSES = ['Confirmed', 'Pending', 'Completed', 'Partial Refunded'];

async function fetchReportData(effectiveTenantId: string | undefined) {
  await dbConnect(effectiveTenantId || undefined);

  const tenantFilter: Record<string, unknown> = {};
  if (effectiveTenantId) {
    tenantFilter.tenantId = effectiveTenantId;
  }

  const today = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(today, 5));

  // Build the month labels for the last 6 months (ordered oldest→newest)
  const monthLabels: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(today, i);
    monthLabels.push({
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM yyyy'),
    });
  }

  // Run all aggregations in parallel — single pipeline for monthly revenue
  const [monthlyResult, topToursData, kpiResult] = await Promise.all([
    // --- 1. Monthly Revenue — single aggregation instead of 6 ---
    Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $in: VALID_STATUSES },
          ...tenantFilter,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]).allowDiskUse(true),

    // --- 2. Top 5 Best-Selling Tours ---
    Booking.aggregate([
      {
        $match: {
          status: { $in: VALID_STATUSES },
          ...tenantFilter,
        },
      },
      {
        $group: {
          _id: '$tour',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: Tour.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'tourDetails',
        },
      },
      {
        $unwind: {
          path: '$tourDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          tourId: '$_id',
          title: { $ifNull: ['$tourDetails.title', 'Unknown Tour'] },
          totalBookings: '$totalBookings',
          totalRevenue: '$totalRevenue',
        },
      },
    ]).allowDiskUse(true),

    // --- 3. KPIs — revenue + count in a single pipeline using $facet ---
    Booking.aggregate([
      {
        $match: {
          status: { $in: VALID_STATUSES },
          ...tenantFilter,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalBookings: { $sum: 1 },
        },
      },
    ]).allowDiskUse(true),
  ]);

  // Map monthly aggregation results into the 6-month ordered array
  const monthlyMap = new Map<string, number>();
  for (const row of monthlyResult) {
    monthlyMap.set(row._id, row.total);
  }
  const monthlyRevenue = monthLabels.map(({ key, label }) => ({
    name: label,
    revenue: monthlyMap.get(key) || 0,
  }));

  // KPIs
  const totalRevenue = kpiResult.length > 0 ? kpiResult[0].totalRevenue : 0;
  const totalBookings = kpiResult.length > 0 ? kpiResult[0].totalBookings : 0;
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  return {
    kpis: {
      totalRevenue,
      totalBookings,
      averageBookingValue: Math.round(averageBookingValue * 100) / 100,
    },
    monthlyRevenue,
    topTours: topToursData,
  };
}

function getCachedReportData(tenantKey: string) {
  return unstable_cache(
    () => fetchReportData(tenantKey === 'all' ? undefined : tenantKey),
    [`report-data-${tenantKey}`],
    { revalidate: 120, tags: ['reports', `reports-${tenantKey}`] }
  )();
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageReports'] });
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const tenantId =
      searchParams.get('tenantId') ||
      searchParams.get('brandId') ||
      searchParams.get('brand_id');
    const tenantKey = tenantId && tenantId !== 'all' ? tenantId : 'all';

    const data = await getCachedReportData(tenantKey);

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Failed to generate report data:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate report data',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}