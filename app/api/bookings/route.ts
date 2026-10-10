import { withAdminAudit } from '@/lib/admin/adminAudit';
// app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { authenticateCustomerSession } from '@/lib/auth/customerSession';

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');

    let query: any = {};

    if (isAdmin) {
      // Admin requests require proper admin auth with manageBookings permission
      const adminAuth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
      if (adminAuth instanceof NextResponse) return adminAuth;

      if (status) {
        query.status = status;
      }
    } else {
      // A customer sees only their own bookings, and only with a customer session
      const authentication = await authenticateCustomerSession(request);
      if (!authentication.success) {
        return NextResponse.json(
          { success: false, error: authentication.error },
          { status: authentication.statusCode }
        );
      }
      query.user = authentication.user._id;
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image images duration rating discountPrice destination',
        populate: {
          path: 'destination',
          model: 'Destination',
          select: 'name slug',
        },
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email name',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out bookings where tour is null (deleted tours)
    const validBookings = bookings.filter(booking => booking.tour !== null);

    const totalCount = validBookings.length;
    const totalPages = Math.ceil(totalCount / limit);

    const transformedBookings = validBookings.map((booking: any) => ({
      ...booking,
      id: booking._id,
      bookingDate: booking.date,
      bookingTime: booking.time,
      participants: booking.guests,
      tour: booking.tour ? {
        ...booking.tour,
        id: booking.tour._id,
      } : null,
      user: booking.user ? {
        ...booking.user,
        id: booking.user._id,
        name: booking.user.name || `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim(),
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: transformedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error: any) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bookings',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

async function POSTHandler(_request: NextRequest) {
  // Direct booking creation trusted client-provided prices and marked records
  // confirmed without payment verification. All new bookings must use checkout,
  // which verifies the payment provider before confirming a booking.
  return NextResponse.json(
    { success: false, error: 'Direct booking creation is disabled. Use checkout.' },
    { status: 410 },
  );
}

export const POST = withAdminAudit(POSTHandler);
