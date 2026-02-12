// app/api/admin/bookings/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
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
  // Require admin auth with manageBookings permission
  const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const { id: bookingId } = await params;

    // Find the booking
    const booking = await Booking.findById(bookingId).populate([
      { path: 'tour', model: Tour },
      { path: 'user', model: User }
    ]);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if already cancelled
    if (booking.status === 'Cancelled') {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
    }

    // Get cancellation reason from request body
    const { reason } = await request.json();

    const user = booking.user as any;
    const tour = booking.tour as any;

    // Calculate refund
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
    if (user && tour) {
      try {
        await EmailService.sendCancellationConfirmation({
          customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer',
          customerEmail: user.email,
          tourTitle: tour.title,
          bookingDate: formatBookingDate(booking.date),
          bookingId: (booking._id as any).toString(),
          refundAmount: refundAmount > 0 ? `$${refundAmount.toFixed(2)}` : undefined,
          refundProcessingDays: refundAmount > 0 ? 5 : undefined,
          cancellationReason: reason || 'Cancelled by administrator',
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
      message: 'Booking cancelled successfully by admin',
      refundAmount,
      refundPercentage,
      cancelledBy: auth.email || auth.userId,
    });

  } catch (error: any) {
    console.error('Admin cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
