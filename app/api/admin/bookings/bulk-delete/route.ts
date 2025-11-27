import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { bookingIds } = await request.json();

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json(
        { error: 'No booking IDs provided' },
        { status: 400 }
      );
    }

    // Validate that all IDs are valid MongoDB ObjectIds
    const validIdPattern = /^[a-fA-F0-9]{24}$/;
    const invalidIds = bookingIds.filter(id => !validIdPattern.test(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid booking ID format', invalidIds },
        { status: 400 }
      );
    }

    await dbConnect();

    // Delete all bookings with the given IDs
    const result = await Booking.deleteMany({
      _id: { $in: bookingIds }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} booking(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error in bulk delete bookings:', error);
    return NextResponse.json(
      { error: 'Failed to delete bookings' },
      { status: 500 }
    );
  }
}
