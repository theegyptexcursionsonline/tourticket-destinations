// app/api/booking/verify/[reference]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Booking reference is required' },
        { status: 400 }
      );
    }

    const tenantId = await getTenantFromRequest();
    await dbConnect(tenantId);

    const booking = await Booking.findOne(
      buildStrictTenantQuery({ bookingReference: reference }, tenantId),
    )
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating',
      })
      .lean();

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Transform booking data for frontend
    const transformedBooking = {
      bookingReference: booking.bookingReference,
      tour: {
        title: (booking.tour as any).title,
        image: (booking.tour as any).image,
        duration: (booking.tour as any).duration,
      },
      date: booking.date,
      time: booking.time,
      guests: booking.guests,
      status: booking.status,
      selectedBookingOption: booking.selectedBookingOption
        ? { title: booking.selectedBookingOption.title }
        : undefined,
    };

    return NextResponse.json(
      {
        success: true,
        booking: transformedBooking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying booking:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to verify booking',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}
