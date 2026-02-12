// app/api/bookings/[id]/cancel/route.ts
// User-facing booking cancellation endpoint with ownership verification
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { EmailService } from '@/lib/email/emailService';
import Tenant from '@/lib/models/Tenant';
import { getTenantEmailBranding } from '@/lib/tenant';

// Helper to format dates consistently and avoid timezone issues
function formatBookingDate(dateValue: Date | string | undefined): string {
  if (!dateValue) return '';
  const dateStr = dateValue instanceof Date ? dateValue.toISOString() : String(dateValue);

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

  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    // Verify user authentication (Firebase or JWT)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let authenticatedUserId: string | undefined;

    // Try Firebase authentication first
    const firebaseResult = await verifyFirebaseToken(token);
    if (firebaseResult.success && firebaseResult.uid) {
      const user = await User.findOne({ firebaseUid: firebaseResult.uid });
      if (user) {
        authenticatedUserId = (user._id as any).toString();
      }
    }

    // Fallback to JWT
    if (!authenticatedUserId) {
      const payload = await verifyToken(token);
      if (payload && payload.sub) {
        authenticatedUserId = payload.sub as string;
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Find the booking
    const booking = await Booking.findById(bookingId).populate([
      { path: 'tour', model: Tour },
      { path: 'user', model: User }
    ]);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const bookingUser = booking.user as any;
    const tour = booking.tour as any;

    // Verify ownership - user can only cancel their own bookings
    if (!bookingUser || bookingUser._id.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'You can only cancel your own bookings' }, { status: 403 });
    }

    // Check if already cancelled
    if (booking.status === 'Cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    // Get cancellation reason from request body
    let reason = '';
    try {
      const body = await request.json();
      reason = body.reason || '';
    } catch {
      // Body may be empty - that's fine
    }

    // Calculate refund based on cancellation policy
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const daysUntilTour = Math.ceil((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let refundPercentage = 0;
    if (daysUntilTour >= 7) refundPercentage = 100;
    else if (daysUntilTour >= 3) refundPercentage = 50;
    else refundPercentage = 0;

    const refundAmount = (booking.totalPrice * refundPercentage) / 100;

    // Update booking status
    booking.status = 'Cancelled';
    await booking.save();

    // Load tenant branding for email
    const bookingTenantId = booking.tenantId || tour?.tenantId;
    const tenantConfig = bookingTenantId
      ? await Tenant.findOne({ tenantId: bookingTenantId }).lean()
      : null;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const tenantBranding = getTenantEmailBranding(tenantConfig as any, baseUrl);

    // Send Cancellation Confirmation Email
    if (bookingUser && tour) {
      try {
        await EmailService.sendCancellationConfirmation({
          customerName: `${bookingUser.firstName || ''} ${bookingUser.lastName || ''}`.trim() || 'Valued Customer',
          customerEmail: bookingUser.email,
          tourTitle: tour.title,
          bookingDate: formatBookingDate(booking.date),
          bookingId: (booking._id as any).toString(),
          refundAmount: refundAmount > 0 ? `$${refundAmount.toFixed(2)}` : undefined,
          refundProcessingDays: refundAmount > 0 ? 5 : undefined,
          cancellationReason: reason || 'Cancelled by customer',
          baseUrl,
          tenantBranding,
        });
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
        // Don't fail the cancellation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      refundAmount,
      refundPercentage,
    });

  } catch (error: any) {
    console.error('User cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
