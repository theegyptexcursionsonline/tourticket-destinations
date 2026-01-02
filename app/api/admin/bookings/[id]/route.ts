// app/api/admin/bookings/[id]/route.ts (Fixed - with correct EmailService)
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';
import { BOOKING_STATUSES_DB, toBookingStatusDb } from '@/lib/constants/bookingStatus';

// Helper to format dates consistently and avoid timezone issues
function formatBookingDate(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  const dateStr = dateString instanceof Date ? dateString.toISOString() : String(dateString);

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// GET - Fetch a single booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const tenantId =
    searchParams.get('tenantId') ||
    searchParams.get('brandId') ||
    searchParams.get('brand_id');
  const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;

  await dbConnect(effectiveTenantId || undefined);

  try {
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

    // Transform the booking data
    const tour = booking.tour as any;
    const user = booking.user as any;
    const transformedBooking = {
      ...booking,
      id: booking._id,
      bookingDate: booking.date,
      bookingTime: booking.time,
      participants: booking.guests,
      tour: tour ? {
        ...tour,
        id: tour._id,
      } : null,
      user: user ? {
        ...user,
        id: user._id,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      } : null,
    };

    return NextResponse.json(transformedBooking);

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

// PATCH - Update booking status (with email notifications)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const tenantId =
    searchParams.get('tenantId') ||
    searchParams.get('brandId') ||
    searchParams.get('brand_id');
  const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;

  await dbConnect(effectiveTenantId || undefined);

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const normalizedStatus = typeof status === 'string' ? (toBookingStatusDb(status) || status) : '';
    if (!normalizedStatus || !BOOKING_STATUSES_DB.includes(normalizedStatus as any)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Get the current booking with populated fields before updating
    const currentBooking = await Booking.findById(id)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating discountPrice destination',
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
      });

    if (!currentBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Store old status for comparison
    const oldStatus = currentBooking.status;

    // Update booking
    currentBooking.status = normalizedStatus as any;
    await currentBooking.save();

    // Reload with lean for response
    const updatedBooking = await Booking.findById(id)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating discountPrice destination',
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

    if (!updatedBooking) {
      return NextResponse.json(
        { success: false, message: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Send email notifications based on status change
    const updatedUser = updatedBooking.user as any;
    const updatedTour = updatedBooking.tour as any;
    if (oldStatus !== status && updatedUser && updatedTour) {
      try {
        const customerName = updatedUser.name || 
          `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || 
          'Valued Customer';
        const customerEmail = updatedUser.email;
        const tourTitle = updatedTour.title || 'Tour';
        const bookingDate = formatBookingDate(updatedBooking.date);
        const bookingTime = updatedBooking.time;
        const bookingId = updatedBooking._id.toString();

        if (normalizedStatus === 'Cancelled') {
          // Calculate potential refund for cancellation email
          const bookingDateObj = new Date(updatedBooking.date);
          const now = new Date();
          const daysUntilTour = Math.ceil((bookingDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let refundPercentage = 0;
          if (daysUntilTour >= 7) refundPercentage = 100;
          else if (daysUntilTour >= 3) refundPercentage = 50;
          else refundPercentage = 0;

          const refundAmount = (updatedBooking.totalPrice * refundPercentage) / 100;

          // Send cancellation confirmation email
          await EmailService.sendCancellationConfirmation({
            customerName,
            customerEmail,
            tourTitle,
            bookingDate,
            bookingId,
            refundAmount: refundAmount > 0 ? `$${refundAmount.toFixed(2)}` : undefined,
            refundProcessingDays: refundAmount > 0 ? 5 : undefined,
            cancellationReason: 'Status changed to cancelled by administrator',
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
          });

          console.log(`✅ Cancellation email sent to ${customerEmail}`);
        } else {
          // Send status update email for other status changes
          const statusMessages = {
            'Confirmed': '✓ Your booking has been confirmed! Get ready for an amazing experience.',
            'Pending': '⏳ Your booking is currently pending. We\'ll update you soon.',
            'Completed': '🌟 Thanks for joining us! Your booking has been marked as completed.',
            'Refunded': '💳 Your booking has been refunded. If you have any questions, reply to this email.',
            'Partial Refunded': '💳 A partial refund has been processed for your booking. If you have questions, reply to this email.',
          };

          await EmailService.sendBookingStatusUpdate({
            customerName,
            customerEmail,
            tourTitle,
            bookingDate,
            bookingTime,
            bookingId,
            newStatus: normalizedStatus,
            statusMessage: statusMessages[normalizedStatus as keyof typeof statusMessages] || 'Your booking status has been updated.',
            additionalInfo: normalizedStatus === 'Confirmed'
              ? 'Please make sure to arrive at the meeting point 15 minutes before the scheduled time.'
              : undefined,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
          });

          console.log(`✅ Status update email sent to ${customerEmail} - Status: ${normalizedStatus}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError);
        // Don't fail the request if email fails, just log it
        // This allows the status update to succeed even if email fails
      }
    }

    // Transform the booking data
    const finalTour = updatedBooking.tour as any;
    const finalUser = updatedBooking.user as any;
    const transformedBooking = {
      ...updatedBooking,
      id: updatedBooking._id,
      bookingDate: updatedBooking.date,
      bookingTime: updatedBooking.time,
      participants: updatedBooking.guests,
      tour: finalTour ? {
        ...finalTour,
        id: finalTour._id,
      } : null,
      user: finalUser ? {
        ...finalUser,
        id: finalUser._id,
        name: finalUser.name || `${finalUser.firstName || ''} ${finalUser.lastName || ''}`.trim(),
      } : null,
    };

    return NextResponse.json(transformedBooking);

  } catch (error: any) {
    console.error('Failed to update booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update booking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const tenantId =
    searchParams.get('tenantId') ||
    searchParams.get('brandId') ||
    searchParams.get('brand_id');
  const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;

  await dbConnect(effectiveTenantId || undefined);

  try {
    const { id } = await params;

    const deletedBooking = await Booking.findByIdAndDelete(id);

    if (!deletedBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
      data: { id: deletedBooking._id },
    });

  } catch (error: any) {
    console.error('Failed to delete booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete booking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}