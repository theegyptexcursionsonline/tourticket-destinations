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
      } else if (booking.status === 'Pending' || booking.status === 'Confirmed') {
        // A live booking's relevant email is the REAL confirmation with the
        // QR voucher — the one checkout/webhook may have failed to deliver.
        const adults = Number(booking.adultGuests || 0);
        const children = Number(booking.childGuests || 0);
        const infants = Number(booking.infantGuests || 0);
        const totalGuests = adults + children + infants || Number(booking.guests || 1);
        await EmailService.sendBookingConfirmation({
          ...common,
          customerPhone: user.phone,
          bookingTime: booking.time,
          participants: `${totalGuests} participant${totalGuests !== 1 ? 's' : ''}`,
          totalPrice: `$${Number(booking.totalPrice || 0).toFixed(2)}`,
          bookingOption: booking.selectedBookingOption?.title,
          specialRequests: booking.specialRequests,
          hotelPickupDetails: booking.hotelPickupDetails,
          meetingPoint: tour.meetingPoint || 'Meeting point will be confirmed 24 hours before tour',
          tourImage: tour.image,
        });
        await Booking.updateOne(
          { _id: booking._id },
          { $set: { confirmationSentAt: new Date() }, $unset: { confirmationEmailFailedAt: 1, confirmationEmailFailureCode: 1 } },
        ).catch(() => undefined);
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
      const failureCode = (emailError instanceof Error ? emailError.message : 'manual_resend_failed').slice(0, 200);
      await Booking.updateOne(
        { _id: booking._id, tenantId: booking.tenantId },
        { $set: { confirmationEmailFailedAt: new Date(), confirmationEmailFailureCode: failureCode } },
      ).catch(() => undefined);
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
      await Booking.updateOne(
        { _id: booking._id, tenantId: booking.tenantId },
        { $set: { operatorNotificationSentAt: new Date() }, $unset: { operatorNotificationFailedAt: 1, operatorNotificationFailureCode: 1 } },
      );
      operatorNotificationSent = true;
    } catch (emailError) {
      console.error('Manual operator notification resend failed:', emailError);
      const failureCode = (emailError instanceof Error ? emailError.message : 'manual_resend_failed').slice(0, 200);
      await Booking.updateOne(
        { _id: booking._id, tenantId: booking.tenantId },
        { $set: { operatorNotificationFailedAt: new Date(), operatorNotificationFailureCode: failureCode } },
      ).catch(() => undefined);
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
