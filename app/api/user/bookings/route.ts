import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { authenticateCustomerSession } from '@/lib/auth/customerSession';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting bookings fetch...');

    // 1. Connect to database
    await dbConnect();
    console.log('✅ Database connected');

    // 2. Only a customer session for an active customer account lists bookings
    const authentication = await authenticateCustomerSession(request);
    if (!authentication.success) {
      return NextResponse.json({ error: authentication.error }, { status: authentication.statusCode });
    }
    const user = authentication.user;
    const userId = String(user._id);

    // 3. Check if Booking model is available
    console.log('📚 Booking model:', Booking.modelName);

    // 4. Fetch bookings count first
    const bookingCount = await Booking.countDocuments({ user: userId });
    console.log('📊 Total bookings for user:', bookingCount);

    // 5. Fetch bookings with detailed logging
    console.log('🔍 Fetching bookings...');
    const bookings = await Booking.find({ user: userId })
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating discountPrice',
        populate: {
          path: 'destination',
          model: 'Destination',
          select: 'name slug'
        }
      })
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    console.log('📦 Raw bookings fetched:', bookings.length);
    console.log('📋 First booking sample:', bookings[0] ? {
      id: bookings[0]._id,
      tourTitle: (bookings[0].tour as any)?.title || 'No tour',
      date: bookings[0].date,
      time: bookings[0].time,
      guests: bookings[0].guests
    } : 'No bookings');

    // 6. Transform bookings for frontend consistency
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      id: booking._id?.toString() || '',
      bookingDate: booking.date,
      bookingTime: booking.time,
      participants: booking.guests,
      tour: booking.tour ? {
        ...(booking.tour as any),
        id: (booking.tour as any)._id?.toString() || '',
      } : null,
    }));

    // 7. Return the data
    return NextResponse.json({ 
      success: true, 
      data: transformedBookings,
      meta: {
        total: bookings.length,
        userId: userId,
        userEmail: user.email
      }
    });

  } catch (error) {
    console.error('💥 DETAILED ERROR in bookings fetch:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch bookings', 
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: process.env.NODE_ENV === 'development' ? {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      } : undefined
    }, { status: 500 });
  }
}