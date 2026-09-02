import Availability from '@/lib/models/Availability';
import Booking from '@/lib/models/Booking';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery } from '@/lib/tenant';
import {
  evaluateDepartureSellability,
  stopSaleAliasesForOption,
  type DepartureSlot,
  type SellableBookingOption,
} from '@/lib/revenue/departureSellability';
import { isTourScheduled, localDepartureToUtc } from '@/lib/revenue/departureSchedule';
import { normalizePriceDate } from '@/lib/revenue/pricingResolver';
import { RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
import type { Types } from 'mongoose';

type SellableTour = {
  _id: Types.ObjectId;
  availability?: {
    type?: string;
    availableDays?: number[];
    startDate?: Date;
    endDate?: Date;
    specificDates?: Date[];
    blockedDates?: Date[];
    slots?: DepartureSlot[];
  };
  bookingOptions?: SellableBookingOption[];
};

type ExplicitAvailability = {
  slots?: DepartureSlot[];
  stopSale?: boolean;
};

type StopSaleRow = { optionIds?: string[] };
type BookingRow = { adultGuests?: number; childGuests?: number; infantGuests?: number; guests?: number };

export type SellableDepartureEvidence = {
  startsAtUtc: string;
  capacity: number;
  booked: number;
  available: number;
  optionId: string;
};

export async function assertRevenuePriceTargetSellable(target: {
  tourId: string;
  optionKey: string;
  date: string;
  time: string;
  tenantId: string;
}): Promise<SellableDepartureEvidence> {
  const tenantId = target.tenantId;
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId)) {
    throw new RevenuePricingWriteError(422, 'TENANT_UNAVAILABLE', 'The pricing tenant is unavailable.');
  }
  const tour = await Tour.findOne(buildStrictTenantQuery({ _id: target.tourId, isPublished: true, archivedAt: null }, tenantId))
    .select('_id availability bookingOptions')
    .lean<SellableTour | null>();
  if (!tour) throw new RevenuePricingWriteError(422, 'TOUR_UNAVAILABLE', 'The approved tour is not published or is outside the requested tenant.');

  const aliases = stopSaleAliasesForOption(tour.bookingOptions, target.optionKey);
  if (aliases.length === 0) {
    throw new RevenuePricingWriteError(422, 'PRICING_OPTION_UNAVAILABLE', 'The target pricing option is no longer available.');
  }

  const date = normalizePriceDate(target.date);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  const [explicit, stopSales, bookings] = await Promise.all([
    Availability.findOne({ tenantId, tour: tour._id, date: { $gte: date, $lte: end } })
      .select('slots stopSale')
      .lean<ExplicitAvailability | null>(),
    StopSale.find({ tenantId, tourId: tour._id, startDate: { $lte: end }, endDate: { $gte: date } })
      .select('optionIds')
      .lean<StopSaleRow[]>(),
    Booking.find({
      $and: [
        {
          tour: tour._id,
          time: target.time,
          status: { $in: ['Confirmed', 'Pending'] },
          $or: [{ date: { $gte: date, $lte: end } }, { dateString: target.date }],
        },
        { tenantId },
      ],
    }).select('adultGuests childGuests infantGuests guests').lean<BookingRow[]>(),
  ]);

  const fullStopSale = stopSales.some((row) => !Array.isArray(row.optionIds) || row.optionIds.length === 0);
  const optionStopSale = stopSales.some((row) => (row.optionIds || []).some((id) => aliases.includes(String(id))));
  const booked = bookings.reduce((sum, booking) => {
    const explicitGuests = Number(booking.adultGuests || 0) + Number(booking.childGuests || 0) + Number(booking.infantGuests || 0);
    return sum + (explicitGuests || Number(booking.guests || 0));
  }, 0);
  const startsAtUtc = localDepartureToUtc(target.date, target.time);
  const result = evaluateDepartureSellability({
    scheduled: isTourScheduled(tour, date),
    startsAtUtc,
    slots: explicit?.slots?.length ? explicit.slots : tour.availability?.slots || [],
    time: target.time,
    explicitStopSale: Boolean(explicit?.stopSale),
    fullStopSale,
    optionStopSale,
    booked,
  });
  return { ...result, optionId: aliases.find((alias) => alias !== target.optionKey) || aliases[0] };
}
