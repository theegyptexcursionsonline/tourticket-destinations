// app/api/admin/bookings/[id]/resend-notification/route.ts
// Admin-initiated resend of a booking's notification emails (customer +
// operator) — used when a send failed or the customer reports nothing
// arrived. Sends the email matching the booking's CURRENT status.
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { EmailService } from '@/lib/email/emailService';
import Tenant from '@/lib/models/Tenant';
import { getTenantEmailBranding } from '@/lib/tenant';

function formatBookingDate(dateValue: Date | string | undefined): string {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const { id: bookingId } = await params;

    const booking = await Booking.findById(bookingId).populate([
      { path: 'tour', model: Tour },
      { path: 'user', model: User },
    ]);
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }
    if (!canAccessTenant(auth, String(booking.tenantId || 'default'))) return tenantForbiddenResponse();

    const user = booking.user as any;
    const tour = booking.tour as any;
    if (!user?.email || !tour?.title) {
      return NextResponse.json({ success: false, error: 'Booking has no customer email or tour.' }, { status: 422 });
    }

    const bookingTenantId = booking.tenantId || tour?.tenantId;
    const tenantConfig = bookingTenantId
      ? await Tenant.findOne({ tenantId: bookingTenantId }).lean()
      : null;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const tenantBranding = getTenantEmailBranding(tenantConfig as any, baseUrl);

    const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Valued Customer';
    const common = {
      customerName,
      customerEmail: user.email,
      tourTitle: tour.title,
      bookingDate: formatBookingDate(booking.date),
      bookingId: (booking._id as any).toString(),
      baseUrl,
      tenantBranding,
    };

    let notificationSent = false;
    try {
      if (booking.status === 'Cancelled') {
        await EmailService.sendCancellationConfirmation({
          ...common,
          cancellationReason: 'Notification re-sent by administrator',
        });
      } else {
        await EmailService.sendBookingStatusUpdate({
          ...common,
          bookingTime: booking.time,
          newStatus: booking.status,
          statusMessage: `Your booking is currently ${booking.status}.`,
        });
      }
      notificationSent = true;
    } catch (emailError) {
      console.error('Manual customer notification resend failed:', emailError);
    }

    let operatorNotificationSent = false;
    try {
      await EmailService.sendAdminBookingStatusUpdate({
        bookingId: (booking._id as any).toString(),
        tourTitle: tour.title,
        customerName,
        customerEmail: user.email,
        customerPhone: user.phone,
        bookingDate: formatBookingDate(booking.date),
        bookingTime: booking.time,
        oldStatus: booking.status,
        newStatus: booking.status,
        changedBy: `${auth.email || 'Admin'} (manual resend)`,
        changedAt: new Date().toISOString(),
        totalPrice: `$${Number(booking.totalPrice || 0).toFixed(2)}`,
        paymentMethod: booking.paymentMethod,
        baseUrl,
        adminCcEmail: tenantBranding?.contactEmail,
        tenantBranding,
      });
      operatorNotificationSent = true;
    } catch (emailError) {
      console.error('Manual operator notification resend failed:', emailError);
    }

    return NextResponse.json({
      success: notificationSent && operatorNotificationSent,
      notificationSent,
      operatorNotificationSent,
    }, { status: notificationSent || operatorNotificationSent ? 200 : 502 });
  } catch (error) {
    console.error('Manual notification resend error:', error);
    return NextResponse.json({ success: false, error: 'Failed to resend notifications.' }, { status: 500 });
  }
}
