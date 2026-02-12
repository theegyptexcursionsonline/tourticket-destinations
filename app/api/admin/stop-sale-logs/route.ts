// app/api/admin/stop-sale-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StopSaleLog from '@/lib/models/StopSaleLog';
import Tour from '@/lib/models/Tour';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch stop sale logs with filtering and pagination
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'appliedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

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

    // Date range filter - filter by appliedAt date
    if (startDate || endDate) {
      query.appliedAt = {};
      if (startDate) {
        (query.appliedAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (query.appliedAt as Record<string, Date>).$lte = end;
      }
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch logs with population
    const [logs, total] = await Promise.all([
      StopSaleLog.find(query)
        .populate('tourId', 'title slug')
        .populate('appliedBy', 'name email firstName lastName')
        .populate('removedBy', 'name email firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      StopSaleLog.countDocuments(query),
    ]);

    // Get tour options for each log entry
    const tourIds = [...new Set(logs.map((log) => log.tourId?._id?.toString()).filter(Boolean))];
    const tours = await Tour.find({ _id: { $in: tourIds } })
      .select('_id bookingOptions')
      .lean();

    const tourOptionsMap = new Map<string, Array<{ id: string; title: string }>>();
    for (const tour of tours) {
      const options = Array.isArray(tour.bookingOptions)
        ? tour.bookingOptions.map((opt: any) => ({
            id: opt?.id || '',
            title: opt?.title || 'Unknown Option',
          }))
        : [];
      tourOptionsMap.set(tour._id.toString(), options);
    }

    // Enrich logs with option titles
    const enrichedLogs = logs.map((log) => {
      const tourIdStr = log.tourId?._id?.toString();
      const options = tourIdStr ? tourOptionsMap.get(tourIdStr) || [] : [];
      
      let optionTitle = 'All options';
      if (log.optionId) {
        const option = options.find((o) => o.id === log.optionId);
        optionTitle = option?.title || log.optionId;
      }

      // Format user names
      const appliedByUser = log.appliedBy as any;
      const removedByUser = log.removedBy as any;

      return {
        ...log,
        optionTitle,
        appliedByName: appliedByUser
          ? appliedByUser.name || `${appliedByUser.firstName || ''} ${appliedByUser.lastName || ''}`.trim() || appliedByUser.email
          : 'Unknown',
        removedByName: removedByUser
          ? removedByUser.name || `${removedByUser.firstName || ''} ${removedByUser.lastName || ''}`.trim() || removedByUser.email
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching stop sale logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stop sale logs' },
      { status: 500 }
    );
  }
}

/**
 * POST: Get logs by specific criteria (logId or date+tour)
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

    // Option 1: Fetch by logId
    if (logId) {
      const log = await StopSaleLog.findById(logId)
        .populate('tourId', 'title slug bookingOptions')
        .populate('appliedBy', 'name email firstName lastName')
        .populate('removedBy', 'name email firstName lastName')
        .lean();

      if (!log) {
        return NextResponse.json(
          { success: false, error: 'Log entry not found' },
          { status: 404 }
        );
      }

      // Get option title
      const tour = log.tourId as any;
      let optionTitle = 'All options';
      if (log.optionId && tour?.bookingOptions) {
        const option = tour.bookingOptions.find((o: any) => o?.id === log.optionId);
        optionTitle = option?.title || log.optionId;
      }

      const appliedByUser = log.appliedBy as any;
      const removedByUser = log.removedBy as any;

      return NextResponse.json({
        success: true,
        data: {
          ...log,
          optionTitle,
          appliedByName: appliedByUser
            ? appliedByUser.name || `${appliedByUser.firstName || ''} ${appliedByUser.lastName || ''}`.trim() || appliedByUser.email
            : 'Unknown',
          removedByName: removedByUser
            ? removedByUser.name || `${removedByUser.firstName || ''} ${removedByUser.lastName || ''}`.trim() || removedByUser.email
            : null,
        },
      });
    }

    // Option 2: Fetch active logs for a specific date and tour
    if (tourId && date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      const query: Record<string, unknown> = {
        tourId,
        status: 'active',
        dateFrom: { $lte: targetDate },
        dateTo: { $gte: targetDate },
      };

      if (tenantId && tenantId !== 'all') {
        query.tenantId = tenantId;
      }

      const logs = await StopSaleLog.find(query)
        .populate('tourId', 'title slug bookingOptions')
        .populate('appliedBy', 'name email firstName lastName')
        .populate('removedBy', 'name email firstName lastName')
        .sort({ appliedAt: -1 })
        .lean();

      // Enrich logs with option titles
      const enrichedLogs = logs.map((log) => {
        const tour = log.tourId as any;
        let optionTitle = 'All options';
        if (log.optionId && tour?.bookingOptions) {
          const option = tour.bookingOptions.find((o: any) => o?.id === log.optionId);
          optionTitle = option?.title || log.optionId;
        }

        const appliedByUser = log.appliedBy as any;
        const removedByUser = log.removedBy as any;

        return {
          ...log,
          optionTitle,
          appliedByName: appliedByUser
            ? appliedByUser.name || `${appliedByUser.firstName || ''} ${appliedByUser.lastName || ''}`.trim() || appliedByUser.email
            : 'Unknown',
          removedByName: removedByUser
            ? removedByUser.name || `${removedByUser.firstName || ''} ${removedByUser.lastName || ''}`.trim() || removedByUser.email
            : null,
        };
      });

      return NextResponse.json({
        success: true,
        data: enrichedLogs,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Either logId or (tourId + date) is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching stop sale log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stop sale log' },
      { status: 500 }
    );
  }
}
