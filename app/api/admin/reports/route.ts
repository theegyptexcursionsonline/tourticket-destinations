// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageReports'] });
  if (auth instanceof NextResponse) return auth;

  try {
    // Get tenant filter from query params
    const { searchParams } = new URL(request.url);
    const tenantId =
      searchParams.get('tenantId') ||
      searchParams.get('brandId') ||
      searchParams.get('brand_id');
    const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;

    // IMPORTANT: connect to tenant-specific DB when a specific brand is selected
    await dbConnect(effectiveTenantId || undefined);
    
    // Build filter for tenant-specific queries
    const tenantFilter: Record<string, unknown> = {};
    if (effectiveTenantId) {
      // Be tolerant of legacy records that might have missing tenantId in a tenant DB
      tenantFilter.$or = [{ tenantId: effectiveTenantId }, { tenantId: { $exists: false } }, { tenantId: null }];
    }

    // --- 1. Monthly Revenue for the Last 6 Months ---
    const monthlyRevenueData = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = subMonths(today, i);
      const monthStart = startOfMonth(targetDate);
      const monthEnd = endOfMonth(targetDate);

      const result = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart, $lte: monthEnd },
            status: { $in: ['Confirmed', 'Pending', 'Completed', 'Partial Refunded'] },
            ...tenantFilter
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalPrice' },
          },
        },
      ]);

      monthlyRevenueData.push({
        name: format(targetDate, 'MMM yyyy'), // e.g., "Jan 2024", "Feb 2024"
        revenue: result.length > 0 ? result[0].total : 0,
      });
    }

    // --- 2. Top 5 Best-Selling Tours ---
    const topToursData = await Booking.aggregate([
      {
        $match: {
          status: { $in: ['Confirmed', 'Pending', 'Completed', 'Partial Refunded'] },
          ...tenantFilter
        }
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
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          tourId: '$_id',
          title: { $ifNull: ['$tourDetails.title', 'Unknown Tour'] },
          totalBookings: '$totalBookings',
          totalRevenue: '$totalRevenue',
        }
      }
    ]);

    // --- 3. Key Performance Indicators (KPIs) ---
    const totalRevenueResult = await Booking.aggregate([
      {
        $match: {
          status: { $in: ['Confirmed', 'Pending', 'Completed', 'Partial Refunded'] },
          ...tenantFilter
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
    const totalBookings = await Booking.countDocuments({ status: { $in: ['Confirmed', 'Pending', 'Completed', 'Partial Refunded'] }, ...tenantFilter });
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const kpis = {
      totalRevenue,
      totalBookings,
      averageBookingValue: Math.round(averageBookingValue * 100) / 100, // Round to 2 decimals
    };

    return NextResponse.json({
      success: true,
      kpis,
      monthlyRevenue: monthlyRevenueData,
      topTours: topToursData,
    });
  } catch (error) {
    console.error('Failed to generate report data:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate report data', 
        error: (error as Error).message 
      }, 
      { status: 500 }
    );
  }
}