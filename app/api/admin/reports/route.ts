// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import dbConnect from '@/lib/dbConnect';
import { cacheIfAvailable } from '@/lib/cache';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import Booking from '@/lib/models/Booking';
import Review from '@/lib/models/Review';
import Tour from '@/lib/models/Tour';

const SUCCESS_STATUSES = ['Confirmed', 'Pending', 'Completed', 'Partial Refunded'];
const CANCELLATION_STATUSES = ['Cancelled', 'Refunded', 'Partial Refunded'];
const REPORT_CACHE_VERSION = 'tenant-tour-scope-v2';
const DEFAULT_REPORT_RANGE = 'this_year';

type TrendInfo = {
  value: number;
  isPositive: boolean;
};

type DateRangeSelection = {
  rangeKey: string;
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  bucket: 'day' | 'month';
  chartKeys: Array<{ key: string; label: string }>;
};

function normalizeDateInput(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildDateSelection(searchParams: URLSearchParams): DateRangeSelection {
  const today = new Date();
  const range = searchParams.get('range') || DEFAULT_REPORT_RANGE;
  const requestedStart = normalizeDateInput(searchParams.get('startDate'));
  const requestedEnd = normalizeDateInput(searchParams.get('endDate'));

  let currentStart: Date;
  let currentEnd: Date;
  let rangeKey = range;

  if (requestedStart && requestedEnd) {
    currentStart = startOfDay(requestedStart);
    currentEnd = endOfDay(requestedEnd);
    rangeKey = `custom:${format(currentStart, 'yyyy-MM-dd')}:${format(currentEnd, 'yyyy-MM-dd')}`;
  } else {
    switch (range) {
      case 'today':
        currentStart = startOfDay(today);
        currentEnd = endOfDay(today);
        break;
      case 'yesterday': {
        const yesterday = subDays(today, 1);
        currentStart = startOfDay(yesterday);
        currentEnd = endOfDay(yesterday);
        break;
      }
      case '7d':
        currentStart = startOfDay(subDays(today, 6));
        currentEnd = endOfDay(today);
        break;
      case 'this_month':
        currentStart = startOfMonth(today);
        currentEnd = endOfDay(today);
        break;
      case 'last_month': {
        const previousMonth = subMonths(today, 1);
        currentStart = startOfMonth(previousMonth);
        currentEnd = endOfMonth(previousMonth);
        break;
      }
      case '30d':
        currentStart = startOfDay(subDays(today, 29));
        currentEnd = endOfDay(today);
        rangeKey = '30d';
        break;
      default:
        currentStart = startOfYear(today);
        currentEnd = endOfDay(today);
        rangeKey = DEFAULT_REPORT_RANGE;
        break;
    }
  }

  const spanDays = Math.max(1, differenceInCalendarDays(currentEnd, currentStart) + 1);
  const previousEnd = endOfDay(subDays(currentStart, 1));
  const previousStart = startOfDay(subDays(currentStart, spanDays));
  const bucket: 'day' | 'month' = spanDays <= 62 ? 'day' : 'month';
  const chartKeys = (bucket === 'day'
    ? eachDayOfInterval({ start: currentStart, end: currentEnd }).map((date) => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'MMM d'),
      }))
    : eachMonthOfInterval({ start: currentStart, end: currentEnd }).map((date) => ({
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM yyyy'),
      })));

  return {
    rangeKey,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    bucket,
    chartKeys,
  };
}

function buildTenantBookingMatch(effectiveTenantId: string | undefined) {
  if (!effectiveTenantId) {
    return {
      tenantId: { $exists: true, $nin: ['default', null, ''] },
    };
  }

  if (effectiveTenantId === 'default') {
    return {
      $or: [
        { tenantId: 'default' },
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' },
      ],
    };
  }

  return {
    tenantId: effectiveTenantId,
  };
}

function buildReviewTenantMatch(effectiveTenantId: string | undefined) {
  if (!effectiveTenantId) {
    return { tenantId: { $exists: true, $nin: ['default', null, ''] } };
  }

  if (effectiveTenantId === 'default') {
    return {
      $or: [
        { tenantId: 'default' },
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' },
      ],
    };
  }

  return { tenantId: effectiveTenantId };
}

function buildBookingTourScopeStages(
  effectiveTenantId: string | undefined,
  asField = 'tourDetails',
) {
  if (effectiveTenantId === 'default') {
    return [];
  }

  if (!effectiveTenantId) {
    return [
      {
        $lookup: {
          from: Tour.collection.name,
          localField: 'tour',
          foreignField: '_id',
          as: asField,
        },
      },
      {
        $unwind: {
          path: `$${asField}`,
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $expr: {
            $or: [
              { $eq: [`$${asField}.tenantId`, '$tenantId'] },
              {
                $in: [
                  '$tenantId',
                  { $ifNull: [`$${asField}.tenantIds`, []] },
                ],
              },
            ],
          },
        },
      },
    ];
  }

  return [
    {
      $lookup: {
        from: Tour.collection.name,
        localField: 'tour',
        foreignField: '_id',
        as: asField,
      },
    },
    {
      $unwind: {
        path: `$${asField}`,
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $or: [
          { [`${asField}.tenantId`]: effectiveTenantId },
          { [`${asField}.tenantIds`]: effectiveTenantId },
        ],
      },
    },
  ];
}

function computeTrend(currentValue: number, previousValue: number): TrendInfo {
  if (previousValue === 0) {
    return {
      value: currentValue > 0 ? 100 : 0,
      isPositive: currentValue >= previousValue,
    };
  }

  const rawChange = ((currentValue - previousValue) / previousValue) * 100;
  return {
    value: Math.round(Math.abs(rawChange) * 10) / 10,
    isPositive: rawChange >= 0,
  };
}

async function fetchReportData(
  effectiveTenantId: string | undefined,
  selection: DateRangeSelection,
) {
  await dbConnect(effectiveTenantId || undefined);

  const currentDateMatch = {
    createdAt: { $gte: selection.currentStart, $lte: selection.currentEnd },
  };
  const previousDateMatch = {
    createdAt: { $gte: selection.previousStart, $lte: selection.previousEnd },
  };
  const chartFormat = selection.bucket === 'day' ? '%Y-%m-%d' : '%Y-%m';
  const tenantBookingMatch = buildTenantBookingMatch(effectiveTenantId);
  const tenantBookingScopeStages = buildBookingTourScopeStages(effectiveTenantId);
  const reviewTenantMatch = buildReviewTenantMatch(effectiveTenantId);

  const [
    currentSuccessRows,
    previousSuccessRows,
    chartRows,
    topToursRows,
    currentCancelledRows,
    currentAllRows,
    reviewRows,
  ] = await Promise.all([
    Booking.aggregate([
      { $match: { ...currentDateMatch, status: { $in: SUCCESS_STATUSES }, ...tenantBookingMatch } },
      ...tenantBookingScopeStages,
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalBookings: { $sum: 1 },
          totalGuests: { $sum: { $ifNull: ['$guests', 0] } },
        },
      },
    ]).allowDiskUse(true),

    Booking.aggregate([
      { $match: { ...previousDateMatch, status: { $in: SUCCESS_STATUSES }, ...tenantBookingMatch } },
      ...tenantBookingScopeStages,
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalBookings: { $sum: 1 },
          totalGuests: { $sum: { $ifNull: ['$guests', 0] } },
        },
      },
    ]).allowDiskUse(true),

    Booking.aggregate([
      { $match: { ...currentDateMatch, status: { $in: SUCCESS_STATUSES }, ...tenantBookingMatch } },
      ...tenantBookingScopeStages,
      {
        $group: {
          _id: {
            $dateToString: {
              format: chartFormat,
              date: '$createdAt',
            },
          },
          revenue: { $sum: '$totalPrice' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).allowDiskUse(true),

    Booking.aggregate([
      { $match: { ...currentDateMatch, status: { $in: SUCCESS_STATUSES }, ...tenantBookingMatch } },
      ...buildBookingTourScopeStages(effectiveTenantId, 'tourDetails'),
      {
        $group: {
          _id: '$tour',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          title: { $first: '$tourDetails.title' },
          rating: { $first: '$tourDetails.rating' },
        },
      },
      { $sort: { totalBookings: -1, totalRevenue: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          tourId: '$_id',
          title: { $ifNull: ['$title', 'Unknown Tour'] },
          totalBookings: 1,
          totalRevenue: 1,
          rating: { $ifNull: ['$rating', 0] },
        },
      },
    ]).allowDiskUse(true),

    Booking.aggregate([
      { $match: { ...currentDateMatch, status: { $in: CANCELLATION_STATUSES }, ...tenantBookingMatch } },
      ...tenantBookingScopeStages,
      {
        $group: {
          _id: null,
          lostRevenue: { $sum: '$totalPrice' },
          cancelledBookings: { $sum: 1 },
        },
      },
    ]).allowDiskUse(true),

    Booking.aggregate([
      { $match: { ...currentDateMatch, ...tenantBookingMatch } },
      ...tenantBookingScopeStages,
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
        },
      },
    ]).allowDiskUse(true),

    Review.aggregate([
      {
        $match: {
          ...reviewTenantMatch,
          createdAt: { $gte: selection.currentStart, $lte: selection.currentEnd },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
              },
            },
          ],
          distribution: [
            {
              $group: {
                _id: '$rating',
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: -1 } },
          ],
        },
      },
    ]).allowDiskUse(true),
  ]);

  const currentSuccess = currentSuccessRows[0] || {
    totalRevenue: 0,
    totalBookings: 0,
    totalGuests: 0,
  };
  const previousSuccess = previousSuccessRows[0] || {
    totalRevenue: 0,
    totalBookings: 0,
    totalGuests: 0,
  };
  const currentAverageBookingValue =
    currentSuccess.totalBookings > 0 ? currentSuccess.totalRevenue / currentSuccess.totalBookings : 0;
  const previousAverageBookingValue =
    previousSuccess.totalBookings > 0 ? previousSuccess.totalRevenue / previousSuccess.totalBookings : 0;

  const chartMap = new Map<string, { revenue: number; bookings: number }>();
  for (const row of chartRows) {
    chartMap.set(row._id, {
      revenue: row.revenue || 0,
      bookings: row.bookings || 0,
    });
  }

  const monthlyRevenue = selection.chartKeys.map(({ key, label }) => ({
    name: label,
    revenue: chartMap.get(key)?.revenue || 0,
    bookings: chartMap.get(key)?.bookings || 0,
  }));

  const cancellations = currentCancelledRows[0] || {
    lostRevenue: 0,
    cancelledBookings: 0,
  };
  const currentAll = currentAllRows[0] || { totalBookings: 0 };
  const cancellationRate =
    currentAll.totalBookings > 0
      ? (cancellations.cancelledBookings / currentAll.totalBookings) * 100
      : 0;

  const reviewData = reviewRows[0] || { summary: [], distribution: [] };
  const ratingSummary = reviewData.summary?.[0] || { averageRating: 0, totalReviews: 0 };
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const match = reviewData.distribution?.find((row: { _id: number; count: number }) => row._id === stars);
    return { stars, count: match?.count || 0 };
  });

  return {
    kpis: {
      totalRevenue: currentSuccess.totalRevenue,
      totalBookings: currentSuccess.totalBookings,
      totalGuests: currentSuccess.totalGuests,
      averageBookingValue: Math.round(currentAverageBookingValue * 100) / 100,
      trends: {
        totalRevenue: computeTrend(currentSuccess.totalRevenue, previousSuccess.totalRevenue),
        totalBookings: computeTrend(currentSuccess.totalBookings, previousSuccess.totalBookings),
        totalGuests: computeTrend(currentSuccess.totalGuests, previousSuccess.totalGuests),
        averageBookingValue: computeTrend(currentAverageBookingValue, previousAverageBookingValue),
      },
    },
    monthlyRevenue,
    topTours: topToursRows,
    cancellations: {
      lostRevenue: cancellations.lostRevenue || 0,
      cancelledBookings: cancellations.cancelledBookings || 0,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      noShowRate: 0,
    },
    ratings: {
      averageRating: ratingSummary.averageRating || 0,
      totalReviews: ratingSummary.totalReviews || 0,
      distribution: ratingDistribution,
    },
  };
}

function getCachedReportData(
  tenantKey: string,
  rangeKey: string,
  selection: DateRangeSelection,
) {
  return cacheIfAvailable(
    () => fetchReportData(tenantKey === 'all' ? undefined : tenantKey, selection),
    [`report-data-${REPORT_CACHE_VERSION}-${tenantKey}-${rangeKey}`],
    { revalidate: 120, tags: ['reports', `reports-${tenantKey}`] },
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
    const selection = buildDateSelection(searchParams);
    const data = await getCachedReportData(tenantKey, selection.rangeKey, selection);

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Failed to generate report data:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate report data',
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
