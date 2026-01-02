import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId =
      searchParams.get('tenantId') ||
      searchParams.get('brandId') ||
      searchParams.get('brand_id');
    const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;

    await dbConnect(effectiveTenantId || undefined);

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
