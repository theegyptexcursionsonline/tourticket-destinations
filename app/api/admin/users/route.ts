import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import Booking from '@/lib/models/Booking';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  await dbConnect();
  try {
    const users = await User.find({}).select('name firstName lastName email createdAt firebaseUid').sort({ createdAt: -1 }).lean();

    const usersWithBookingCounts = await Promise.all(
      users.map(async (user) => {
        // Query by both ObjectId and string ID to handle any data inconsistencies
        // Also check by email as a fallback for guest bookings that might have mismatched user refs
        const bookingCount = await Booking.countDocuments({
          $or: [
            { user: user._id },
            { user: user._id.toString() },
          ]
        });
        return {
          ...user,
          bookingCount,
        };
      }),
    );

    return NextResponse.json(usersWithBookingCounts);
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch users', error: (error as Error).message },
      { status: 500 },
    );
  }
}