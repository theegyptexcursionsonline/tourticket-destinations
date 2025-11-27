// lib/jobs/emailJobs.ts
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';

// Helper to format dates consistently and avoid timezone issues
// MongoDB stores dates in UTC which can cause off-by-one day errors when reformatted
function formatBookingDate(dateValue: Date | string | undefined): string {
  if (!dateValue) return '';

  // Convert to string if Date object
  const dateStr = dateValue instanceof Date
    ? dateValue.toISOString()
    : String(dateValue);

  // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
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

  // Fallback
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Send trip reminders (run this daily)
export async function sendTripReminders() {
  try {
    await dbConnect();

    // Find bookings that are tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const upcomingBookings = await Booking.find({
      date: {
        $gte: tomorrow,
        $lte: endOfTomorrow
      },
      status: 'Confirmed'
    }).populate([
      { path: 'tour', model: Tour },
      { path: 'user', model: User }
    ]);

    console.log(`Found ${upcomingBookings.length} bookings for tomorrow`);

    for (const booking of upcomingBookings) {
      try {
        await EmailService.sendTripReminder({
          customerName: `${booking.user.firstName} ${booking.user.lastName}`,
          customerEmail: booking.user.email,
          tourTitle: booking.tour.title,
          bookingDate: formatBookingDate(booking.date),
          bookingTime: booking.time,
          meetingPoint: booking.tour.meetingPoint || "Meeting point will be provided via WhatsApp",
          contactNumber: "+20 11 42255624",
          weatherInfo: "Sunny, 28°C - Perfect weather for sightseeing!",
          whatToBring: [
            "Comfortable walking shoes",
            "Sun hat and sunglasses",
            "Camera",
            "Water bottle",
            "Light jacket for evening"
          ],
          importantNotes: "Please arrive 15 minutes early at the meeting point. Our guide will be wearing an Egypt Excursions Online badge.",
          bookingId: booking._id.toString()
        });

        console.log(`✅ Trip reminder sent for booking ${booking._id}`);
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

    // Find bookings that were yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const completedBookings = await Booking.find({
      date: {
        $gte: yesterday,
        $lte: endOfYesterday
      },
      status: 'Confirmed'
    }).populate([
      { path: 'tour', model: Tour },
      { path: 'user', model: User }
    ]);

    console.log(`Found ${completedBookings.length} completed bookings from yesterday`);

    for (const booking of completedBookings) {
      try {
        await EmailService.sendTripCompletion({
          customerName: `${booking.user.firstName} ${booking.user.lastName}`,
          customerEmail: booking.user.email,
          tourTitle: booking.tour.title,
          bookingDate: formatBookingDate(booking.date),
          reviewLink: `${process.env.NEXT_PUBLIC_BASE_URL}/tour/${booking.tour.slug}?review=true`,
          photoSharingLink: `${process.env.NEXT_PUBLIC_BASE_URL}/share-photos/${booking._id}`,
          recommendedTours: [
            {
              title: "Alexandria Day Trip",
              image: `${process.env.NEXT_PUBLIC_BASE_URL}/images/alexandria.jpg`,
              price: "$75",
              link: `${process.env.NEXT_PUBLIC_BASE_URL}/tour/alexandria-day-trip`
            },
            {
              title: "Desert Safari Adventure",
              image: `${process.env.NEXT_PUBLIC_BASE_URL}/images/desert.jpg`,
              price: "$120",
              link: `${process.env.NEXT_PUBLIC_BASE_URL}/tour/desert-safari`
            }
          ]
        });

        console.log(`✅ Trip completion email sent for booking ${booking._id}`);
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