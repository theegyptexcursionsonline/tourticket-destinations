// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Destination from '@/lib/models/Destination';

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    // Support optional tenant filtering for multi-tenant admin
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    // Build query with optional tenant filter
    const query: Record<string, unknown> = {};
    if (tenantId && tenantId !== 'all') {
      query.tenantId = tenantId;
    }

    const bookings = await Booking.find(query)
      .populate({ 
        path: 'tour', 
        model: Tour, 
        select: 'title image duration destination tenantId',
        populate: {
          path: 'destination',
          model: Destination,
          select: 'name slug',
        }
      })
      .populate({ 
        path: 'user', 
        model: User, 
        select: 'name email firstName lastName' 
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out bookings with null tours (deleted tours)
    const validBookings = bookings.filter(booking => booking.tour !== null);

    return NextResponse.json(validBookings);
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings' }, { status: 500 });
  }
}