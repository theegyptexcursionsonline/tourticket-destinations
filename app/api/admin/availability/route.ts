// app/api/admin/availability/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Availability from '@/lib/models/Availability';
import Tour from '@/lib/models/Tour';

export const dynamic = 'force-dynamic';

// GET - Fetch availability for a tour/month
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId');
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const tenantId = searchParams.get('tenantId');

    // Build query
    const query: Record<string, unknown> = {};
    
    if (tourId) {
      query.tour = tourId;
    }
    
    if (tenantId && tenantId !== 'all') {
      query.tenantId = tenantId;
    }

    // Date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    query.date = { $gte: startDate, $lte: endDate };

    const availability = await Availability.find(query)
      .populate('tour', 'title slug')
      .sort({ date: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: availability,
      meta: { month, year, count: availability.length },
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

// POST - Create or update availability
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { tourId, date, slots, stopSale, stopSaleReason, tenantId, notes } = body;

    if (!tourId || !date || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tour ID, date, and tenant ID are required' },
        { status: 400 }
      );
    }

    // Verify tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json(
        { success: false, error: 'Tour not found' },
        { status: 404 }
      );
    }

    // Parse date
    const availabilityDate = new Date(date);
    availabilityDate.setHours(0, 0, 0, 0);

    // Upsert availability
    const availability = await Availability.findOneAndUpdate(
      { tour: tourId, date: availabilityDate },
      {
        tour: tourId,
        date: availabilityDate,
        slots: slots || [],
        stopSale: stopSale || false,
        stopSaleReason: stopSaleReason || '',
        tenantId,
        notes: notes || '',
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('Error creating availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create availability' },
      { status: 500 }
    );
  }
}

// PUT - Bulk update availability
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { tourId, dates, action, tenantId, slots, stopSale, stopSaleReason } = body;

    if (!tourId || !dates || !Array.isArray(dates) || !action || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tour ID, dates array, action, and tenant ID are required' },
        { status: 400 }
      );
    }

    const operations = [];

    for (const dateStr of dates) {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);

      const updateData: Record<string, unknown> = { tenantId };

      switch (action) {
        case 'block':
          updateData.stopSale = true;
          updateData.stopSaleReason = stopSaleReason || 'Blocked';
          break;
        case 'unblock':
          updateData.stopSale = false;
          updateData.stopSaleReason = '';
          break;
        case 'updateSlots':
          if (slots) updateData.slots = slots;
          break;
        case 'setStopSale':
          updateData.stopSale = stopSale;
          updateData.stopSaleReason = stopSaleReason || '';
          break;
      }

      operations.push({
        updateOne: {
          filter: { tour: tourId, date },
          update: { $set: { ...updateData, tour: tourId, date } },
          upsert: true,
        },
      });
    }

    const result = await Availability.bulkWrite(operations);

    return NextResponse.json({
      success: true,
      data: {
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      },
    });
  } catch (error) {
    console.error('Error bulk updating availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk update availability' },
      { status: 500 }
    );
  }
}

