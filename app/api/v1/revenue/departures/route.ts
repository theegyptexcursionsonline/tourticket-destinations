import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Availability from '@/lib/models/Availability';
import Booking from '@/lib/models/Booking';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery } from '@/lib/tenant';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { EEO_TIME_ZONE, isTourScheduled, localDepartureToUtc, parseIsoDateOnly } from '@/lib/revenue/departureSchedule';
import { stoppedPricingKeysForOptionIds } from '@/lib/revenue/departureSellability';
import type { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

const key = (tourId: unknown, date: Date, time = '') => `${tourId}:${date.toISOString().slice(0, 10)}:${time}`;

type DepartureSlot = { time: string; capacity: number; booked?: number; extraCapacity?: number; blocked?: boolean };
type DepartureTour = {
  _id: Types.ObjectId;
  availability?: {
    type?: string; availableDays?: number[]; startDate?: Date; endDate?: Date;
    specificDates?: Date[]; blockedDates?: Date[]; slots?: DepartureSlot[];
  };
  bookingOptions?: Array<{ _id?: unknown; id?: string; pricingKey?: string }>;
  updatedAt?: Date;
};
type ExplicitAvailability = { tour: Types.ObjectId; date: Date; slots: DepartureSlot[]; stopSale: boolean; updatedAt: Date };
type DepartureBooking = {
  tour: Types.ObjectId; date: Date; time?: string; adultGuests?: number; childGuests?: number;
  infantGuests?: number; guests?: number; updatedAt: Date;
};
type DepartureStopSale = { tourId: Types.ObjectId; optionIds: string[]; startDate: Date; endDate: Date };
type Departure = {
  tourId: string; date: string; time: string; startsAtUtc: string; timeZone: string;
  capacity: number; booked: number; available: number; blocked: boolean;
  stoppedOptionIds: string[]; stoppedOptionKeys: string[]; updatedAt?: Date;
};

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  const tenantId = auth.tenantId!;
  await dbConnect();
  const from = request.nextUrl.searchParams.get('from') || new Date().toISOString().slice(0, 10);
  const to = request.nextUrl.searchParams.get('to') || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const rangeStart = parseIsoDateOnly(from);
  const parsedRangeEnd = parseIsoDateOnly(to);
  if (!rangeStart || !parsedRangeEnd) return revenueError(400, 'INVALID_RANGE', 'from and to must use real calendar dates in YYYY-MM-DD.');
  const rangeEnd = new Date(parsedRangeEnd);
  rangeEnd.setUTCHours(23, 59, 59, 999);
  if (rangeEnd < rangeStart) return revenueError(400, 'INVALID_RANGE', 'to must be on or after from.');
  if ((rangeEnd.getTime() - rangeStart.getTime()) / 86400000 > 120) return revenueError(400, 'RANGE_TOO_LARGE', 'Departure reads are limited to 120 days.');

  const tours = await Tour.find(buildStrictTenantQuery({ isPublished: true, archivedAt: null }, tenantId))
    .select('_id availability bookingOptions updatedAt')
    .lean<DepartureTour[]>();
  const tourIds = tours.map((tour) => tour._id);
  const [explicitRows, bookings, stopSales] = await Promise.all([
    Availability.find({ tenantId, tour: { $in: tourIds }, date: { $gte: rangeStart, $lte: rangeEnd } }).lean<ExplicitAvailability[]>(),
    Booking.find({ tenantId, tour: { $in: tourIds }, status: { $in: ['Confirmed', 'Pending'] }, $or: [{ date: { $gte: rangeStart, $lte: rangeEnd } }, { dateString: { $gte: from, $lte: to } }] }).select('tour date dateString time adultGuests childGuests infantGuests guests updatedAt').lean<DepartureBooking[]>(),
    StopSale.find({ tenantId, tourId: { $in: tourIds }, startDate: { $lte: rangeEnd }, endDate: { $gte: rangeStart } }).select('tourId optionIds startDate endDate').lean<DepartureStopSale[]>(),
  ]);
  const explicit = new Map(explicitRows.map((row) => [key(row.tour, new Date(row.date)), row]));
  const booked = new Map<string, number>();
  const bookingUpdated = new Map<string, Date>();
  for (const booking of bookings) {
    const bookingKey = key(booking.tour, new Date(booking.date), booking.time || '10:00');
    const guestCount = Number(booking.adultGuests || 0) + Number(booking.childGuests || 0) + Number(booking.infantGuests || 0);
    booked.set(bookingKey, (booked.get(bookingKey) || 0) + (guestCount || Number(booking.guests || 0)));
    bookingUpdated.set(bookingKey, booking.updatedAt);
  }
  const fullyStopped = new Set<string>();
  const stoppedOptions = new Map<string, Set<string>>();
  for (const stopSale of stopSales) {
    const startDay = new Date(`${new Date(Math.max(rangeStart.getTime(), new Date(stopSale.startDate).getTime())).toISOString().slice(0, 10)}T00:00:00.000Z`);
    const endDay = new Date(`${new Date(Math.min(rangeEnd.getTime(), new Date(stopSale.endDate).getTime())).toISOString().slice(0, 10)}T00:00:00.000Z`);
    for (let date = startDay; date <= endDay; date = new Date(date.getTime() + 86400000)) {
      const dateKey = key(stopSale.tourId, date);
      if (!Array.isArray(stopSale.optionIds) || stopSale.optionIds.length === 0) {
        fullyStopped.add(dateKey);
        continue;
      }
      const existing = stoppedOptions.get(dateKey) || new Set<string>();
      stopSale.optionIds.forEach((optionId) => existing.add(String(optionId)));
      stoppedOptions.set(dateKey, existing);
    }
  }

  const departures: Departure[] = [];
  for (const tour of tours) {
    for (let date = new Date(rangeStart); date <= rangeEnd; date = new Date(date.getTime() + 86400000)) {
      if (!isTourScheduled(tour, date)) continue;
      const explicitRow = explicit.get(key(tour._id, date));
      const slots = explicitRow?.slots?.length ? explicitRow.slots : tour.availability?.slots || [];
      for (const slot of slots) {
        const bookingKey = key(tour._id, date, slot.time);
        const sold = Math.max(Number(slot.booked || 0), booked.get(bookingKey) || 0);
        const capacity = Number(slot.capacity || 0) + Number(slot.extraCapacity || 0);
        const dateKey = key(tour._id, date);
        const blocked = Boolean(fullyStopped.has(dateKey) || explicitRow?.stopSale || slot.blocked);
        const stoppedOptionIds = Array.from(stoppedOptions.get(dateKey) || []).sort();
        const stoppedOptionKeys = stoppedPricingKeysForOptionIds(tour.bookingOptions, stoppedOptionIds).sort();
        const departureDate = date.toISOString().slice(0, 10);
        departures.push({ tourId: String(tour._id), date: departureDate, time: slot.time, startsAtUtc: localDepartureToUtc(departureDate, slot.time), timeZone: EEO_TIME_ZONE, capacity, booked: sold, available: blocked ? 0 : Math.max(0, capacity - sold), blocked, stoppedOptionIds, stoppedOptionKeys, updatedAt: bookingUpdated.get(bookingKey) || explicitRow?.updatedAt || tour.updatedAt });
      }
    }
  }
  return NextResponse.json({ tenantId, timeZone: EEO_TIME_ZONE, departures }, { headers: { 'Cache-Control': 'no-store' } });
}
