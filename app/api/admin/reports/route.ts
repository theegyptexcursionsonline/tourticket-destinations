// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get tenant filter from query params
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    // Build filter for tenant-specific queries
    const tenantFilter: Record<string, unknown> = {};
    if (tenantId && tenantId !== 'all') {
      tenantFilter.tenantId = tenantId;
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
            status: { $in: ['Confirmed', 'Pending'] },
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
          status: { $in: ['Confirmed', 'Pending'] },
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
          status: { $in: ['Confirmed', 'Pending'] },
          ...tenantFilter
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
    const totalBookings = await Booking.countDocuments({ status: { $in: ['Confirmed', 'Pending'] }, ...tenantFilter });
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