import { futureCatalogueTimes, DepartureConfigurationError } from '@/lib/bookings/departureAdmission';
import { buildStrictTenantQuery, getTenantFromRequest, getTenantConfigCached } from '@/lib/tenant';
// app/api/tours/[tourId]/availability/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Booking from '@/lib/models/Booking';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tourId: string }> }
) {
  await dbConnect();
  try {
    const { tourId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // e.g., "2025-09"

    if (!month) {
      return NextResponse.json({ message: 'Month parameter is required' }, { status: 400 });
    }

    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantConfigCached(tenantId);
    if (!tenant?.localization?.defaultTimezone) return NextResponse.json({ message: 'Booking timezone unavailable' }, { status: 503 });
    const tour = await Tour.findOne(buildStrictTenantQuery({ _id: tourId, isPublished: true, archivedAt: null }, tenantId)).select('availability bookingOptions bookingCutoffMinutes');
    if (!tour || !tour.availability) {
      return NextResponse.json({ message: 'Tour or availability rules not found' }, { status: 404 });
    }

    // --- Date Calculation Logic ---
    const [year, monthIndex] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthIndex - 1, 1));
    const endDate = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59));

    // --- Get all bookings for the tour in the given month ---
    const existingBookings = await Booking.find({
      tour: tourId,
      tenantId,
      date: { $gte: startDate, $lte: endDate },
    }).select('date time guests');

    // --- Process bookings into a quick-lookup map ---
    // Structure: { 'YYYY-MM-DD': { 'HH:MM AM/PM': totalGuests } }
    const bookingsMap = new Map<string, Map<string, number>>();
    for (const booking of existingBookings) {
      const dateString = booking.date.toISOString().split('T')[0];
      if (!bookingsMap.has(dateString)) {
        bookingsMap.set(dateString, new Map());
      }
      const timeMap = bookingsMap.get(dateString)!;
      const currentGuests = timeMap.get(booking.time) || 0;
      timeMap.set(booking.time, currentGuests + booking.guests);
    }
    
    const { availableDays, slots } = tour.availability;
    const availableSlotsByDate: { [key: string]: any[] } = {};
    const fullyBookedDates: string[] = [];

    // --- Iterate through each day of the month to check availability ---
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getUTCDay();
        const dateString = d.toISOString().split('T')[0];

        // Check if the day is an available day of the week
        if (availableDays?.includes(dayOfWeek)) {
            const timeSlotsForDay = [];
            let allSlotsFull = true;

            const future = new Set(Object.values(futureCatalogueTimes(tour, dateString, tenant.localization.defaultTimezone)).flat());
            for (const slot of slots) {
                if (!future.has(slot.time)) continue;
                const bookedGuests = bookingsMap.get(dateString)?.get(slot.time) || 0;
                const remainingCapacity = slot.capacity - bookedGuests;
                
                if (remainingCapacity > 0) {
                    timeSlotsForDay.push({ time: slot.time, remaining: remainingCapacity });
                    allSlotsFull = false;
                }
            }

            if (timeSlotsForDay.length > 0) {
                availableSlotsByDate[dateString] = timeSlotsForDay;
            }

            if (allSlotsFull) {
                fullyBookedDates.push(dateString);
            }
        }
    }

    return NextResponse.json({ availableSlotsByDate, fullyBookedDates });

  } catch (error) {
    if (error instanceof DepartureConfigurationError) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    console.error('Failed to get availability:', error);
    return NextResponse.json({ message: 'Failed to get availability', error: (error as Error).message }, { status: 500 });
  }
}