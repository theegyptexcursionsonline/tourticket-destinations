// lib/jobs/emailJobs.ts
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Tenant from '@/lib/models/Tenant';
import { EmailService } from '@/lib/email/emailService';
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
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// Send trip reminders (run this daily)
export async function sendTripReminders() {
  try {
    await dbConnect();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const upcomingBookings = await Booking.find({
      date: { $gte: tomorrow, $lte: endOfTomorrow },
      status: 'Confirmed'
    }).populate([
      { path: 'tour', model: Tour },
      { path: 'user', model: User }
    ]);

    console.log(`Found ${upcomingBookings.length} bookings for tomorrow`);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

    for (const booking of upcomingBookings) {
      try {
        // Load tenant config for branded emails
        const tenantConfig = booking.tenantId
          ? await Tenant.findOne({ tenantId: booking.tenantId }).lean()
          : null;
        const tenantBranding = getTenantEmailBranding(tenantConfig as any, baseUrl);
        const companyName = tenantConfig?.name || 'Excursions Online';

        await EmailService.sendTripReminder({
          customerName: `${(booking.user as any).firstName} ${(booking.user as any).lastName}`,
          customerEmail: (booking.user as any).email,
          tourTitle: (booking.tour as any).title,
          bookingDate: formatBookingDate(booking.date),
          bookingTime: booking.time,
          meetingPoint: (booking.tour as any).meetingPoint || "Meeting point will be provided via WhatsApp",
          contactNumber: tenantConfig?.contact?.phone || "+20 11 42255624",
          weatherInfo: "Sunny, 28°C - Perfect weather for sightseeing!",
          whatToBring: [
            "Comfortable walking shoes",
            "Sun hat and sunglasses",
            "Camera",
            "Water bottle",
            "Light jacket for evening"
          ],
          importantNotes: `Please arrive 15 minutes early at the meeting point. Our guide will be wearing a ${companyName} badge.`,
          bookingId: (booking._id as any).toString(),
          tenantBranding,
        });

        console.log(`✅ Trip reminder sent for booking ${booking._id} (tenant: ${booking.tenantId || 'default'})`);
      } catch (emailError) {
        console.error(`❌ Failed to send reminder for booking ${booking._id}:`, emailError);
      }
    }

    return { success: true, sent: upcomingBookings.length };
  } catch (error) {
    console.error('Error sending trip reminders:', error);
    throw error;
  }
}

// Send trip completion emails (run this daily)
export async function sendTripCompletionEmails() {
  try {
    await dbConnect();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const completedBookings = await Booking.find({
      date: { $gte: yesterday, $lte: endOfYesterday },
      status: 'Confirmed'
    }).populate([
      { path: 'tour', model: Tour },
      { path: 'user', model: User }
    ]);

    console.log(`Found ${completedBookings.length} completed bookings from yesterday`);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

    for (const booking of completedBookings) {
      try {
        // Load tenant config for branded emails
        const tenantConfig = booking.tenantId
          ? await Tenant.findOne({ tenantId: booking.tenantId }).lean()
          : null;
        const tenantBranding = getTenantEmailBranding(tenantConfig as any, baseUrl);

        await EmailService.sendTripCompletion({
          customerName: `${(booking.user as any).firstName} ${(booking.user as any).lastName}`,
          customerEmail: (booking.user as any).email,
          tourTitle: (booking.tour as any).title,
          bookingDate: formatBookingDate(booking.date),
          reviewLink: `${baseUrl}/tour/${(booking.tour as any).slug}?review=true`,
          photoSharingLink: `${baseUrl}/share-photos/${booking._id}`,
          recommendedTours: [
            {
              title: "Alexandria Day Trip",
              image: `${baseUrl}/images/alexandria.jpg`,
              price: "$75",
              link: `${baseUrl}/tour/alexandria-day-trip`
            },
            {
              title: "Desert Safari Adventure",
              image: `${baseUrl}/images/desert.jpg`,
              price: "$120",
              link: `${baseUrl}/tour/desert-safari`
            }
          ],
          tenantBranding,
        });

        console.log(`✅ Trip completion email sent for booking ${booking._id} (tenant: ${booking.tenantId || 'default'})`);
      } catch (emailError) {
        console.error(`❌ Failed to send completion email for booking ${booking._id}:`, emailError);
      }
    }

    return { success: true, sent: completedBookings.length };
  } catch (error) {
    console.error('Error sending trip completion emails:', error);
    throw error;
  }
}
