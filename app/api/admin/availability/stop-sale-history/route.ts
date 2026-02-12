// app/api/admin/availability/stop-sale-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StopSaleLog from '@/lib/models/StopSaleLog';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch stop sale history with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await requireAdminAuth(request, { permissions: ['manageTours'] });
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const tourId = searchParams.get('tourId');
    const status = searchParams.get('status'); // 'active', 'removed', or 'all'
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build query
    const query: Record<string, unknown> = {};

    if (tenantId && tenantId !== 'all') {
      query.tenantId = tenantId;
    }

    if (tourId && tourId !== 'all') {
      query.tourId = tourId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by date range (overlapping with dateFrom/dateTo)
    if (dateFrom || dateTo) {
      const dateConditions: Record<string, unknown>[] = [];
      if (dateFrom) {
        dateConditions.push({ dateTo: { $gte: new Date(dateFrom) } });
      }
      if (dateTo) {
        dateConditions.push({ dateFrom: { $lte: new Date(dateTo) } });
      }
      if (dateConditions.length > 0) {
        query.$and = dateConditions;
      }
    }

    // Get total count for pagination
    const total = await StopSaleLog.countDocuments(query);

    // Fetch logs with pagination
    const logs = await StopSaleLog.find(query)
      .sort({ appliedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('tourId', 'title slug bookingOptions')
      .populate('appliedBy', 'firstName lastName email name')
      .populate('removedBy', 'firstName lastName email name')
      .lean();

    // Transform logs to include option title
    const transformedLogs = logs.map((log: any) => {
      let optionTitle = 'All options';
      if (log.optionId && log.tourId?.bookingOptions) {
        const option = log.tourId.bookingOptions.find((opt: any) => opt?.id === log.optionId);
        if (option) {
          optionTitle = option.title || option.name || log.optionId;
        }
      }

      // Format user name
      const getDisplayName = (user: any) => {
        if (!user) return 'Unknown';
        if (user.firstName && user.lastName) {
          return `${user.firstName} ${user.lastName}`;
        }
        if (user.name) return user.name;
        if (user.email) return user.email;
        return 'Unknown';
      };

      return {
        _id: log._id,
        tourId: log.tourId?._id || log.tourId,
        tourTitle: log.tourId?.title || 'Unknown Tour',
        tourSlug: log.tourId?.slug,
        optionId: log.optionId,
        optionTitle,
        dateFrom: log.dateFrom,
        dateTo: log.dateTo,
        reason: log.reason || '',
        appliedBy: {
          _id: log.appliedBy?._id,
          name: getDisplayName(log.appliedBy),
          email: log.appliedBy?.email,
        },
        appliedAt: log.appliedAt,
        removedBy: log.removedBy
          ? {
              _id: log.removedBy._id,
              name: getDisplayName(log.removedBy),
              email: log.removedBy.email,
            }
          : null,
        removedAt: log.removedAt,
        status: log.status,
        tenantId: log.tenantId,
        createdAt: log.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching stop sale history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stop sale history' },
      { status: 500 }
    );
  }
}

/**
 * GET single log entry by ID (for detail view)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await requireAdminAuth(request, { permissions: ['manageTours'] });
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await dbConnect();

    const body = await request.json();
    const { logId, tourId, date, tenantId } = body;

    if (logId) {
      // Fetch specific log entry by ID
      const log = await StopSaleLog.findById(logId)
        .populate('tourId', 'title slug bookingOptions')
        .populate('appliedBy', 'firstName lastName email name')
        .populate('removedBy', 'firstName lastName email name')
        .lean();

      if (!log) {
        return NextResponse.json({ success: false, error: 'Log not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: log });
    }

    // Fetch logs for a specific tour and date (for calendar click)
    if (tourId && date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      const query: Record<string, unknown> = {
        tourId,
        dateFrom: { $lte: targetDate },
        dateTo: { $gte: targetDate },
      };

      if (tenantId && tenantId !== 'all') {
        query.tenantId = tenantId;
      }

      const logs = await StopSaleLog.find(query)
        .sort({ appliedAt: -1 })
        .populate('tourId', 'title slug bookingOptions')
        .populate('appliedBy', 'firstName lastName email name')
        .populate('removedBy', 'firstName lastName email name')
        .lean();

      return NextResponse.json({ success: true, data: logs });
    }

    return NextResponse.json({ success: false, error: 'logId or (tourId + date) required' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching stop sale log details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stop sale log details' },
      { status: 500 }
    );
  }
}
