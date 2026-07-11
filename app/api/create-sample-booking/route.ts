import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
    if (auth instanceof NextResponse) return auth;

    await dbConnect();

    const user = await User.findById(auth.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get first available tour
    const tenantId = await getTenantFromRequest();
    const tour = await Tour.findOne(buildStrictTenantQuery({ isPublished: true }, tenantId));
    if (!tour) {
      return NextResponse.json({ error: 'No tours available' }, { status: 404 });
    }

    // Create sample booking
    const sampleBooking = new Booking({
      tour: tour._id,
      user: user._id,
      tenantId,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      time: '10:00',
      guests: 2,
      totalPrice: 75.00,
      status: 'Confirmed'
    });

    await sampleBooking.save();

    return NextResponse.json({
      success: true,
      message: 'Sample booking created',
      booking: sampleBooking
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
