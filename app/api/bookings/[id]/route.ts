// app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';
import { verifyFirebaseToken } from '@/lib/firebase/admin';

// GET - Fetch a single booking by ID (user must own the booking)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    // Verify user authentication - Try Firebase first, fallback to JWT
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let userId: string;

    // Try Firebase authentication first
    const firebaseResult = await verifyFirebaseToken(token);

    if (firebaseResult.success && firebaseResult.uid) {
      // Find user by Firebase UID
      const user = await User.findOne({ firebaseUid: firebaseResult.uid });

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }

      userId = (user._id as any).toString();
    } else {
      // Fallback to JWT (for backwards compatibility)
      const payload = await verifyToken(token);

      if (!payload || !payload.sub) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      userId = payload.sub as string;
    }

    const { id } = await params;

    const booking = await Booking.findById(id)
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
      .lean();

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingUser = booking.user as any;
    const bookingTour = booking.tour as any;

    // Verify ownership
    if (bookingUser._id.toString() !== userId) {
      return NextResponse.json(
        { success: false, message: 'Not authorized to view this booking' },
        { status: 403 }
      );
    }

    // Transform the booking data
    const transformedBooking = {
      ...booking,
      id: booking._id,
      bookingDate: booking.date,
      bookingTime: booking.time,
      participants: booking.guests,
      tour: bookingTour ? {
        ...bookingTour,
        id: bookingTour._id,
      } : null,
      user: bookingUser ? {
        ...bookingUser,
        id: bookingUser._id,
        name: bookingUser.name || `${bookingUser.firstName || ''} ${bookingUser.lastName || ''}`.trim(),
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: transformedBooking,
    });

  } catch (error: any) {
    console.error('Failed to fetch booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch booking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}