import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking, { type IBooking } from '@/lib/models/Booking';
import type { FilterQuery } from 'mongoose';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantConfigCached } from '@/lib/tenant';
import { authenticateRevenueRequest } from '@/lib/revenue/machineResponse';
import mongoose from 'mongoose';
import { revenueBookingCurrency } from '@/lib/revenue/bookingContract';
import { parseIsoDateOnly } from '@/lib/revenue/departureSchedule';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  const tenantId = auth.tenantId!;
  await dbConnect();
  const updatedSince = request.nextUrl.searchParams.get('updatedSince');
  const afterId = request.nextUrl.searchParams.get('afterId');
  const requestedTourId = request.nextUrl.searchParams.get('tourId');
  const departureFrom = request.nextUrl.searchParams.get('departureFrom');
  const departureTo = request.nextUrl.searchParams.get('departureTo');
  const rawLimit = Number(request.nextUrl.searchParams.get('limit') || 500);
  if (!Number.isInteger(rawLimit) || rawLimit < 1) {
    return NextResponse.json({ error: { code: 'INVALID_LIMIT', message: 'limit must be a positive integer.' } }, { status: 422 });
  }
  const limit = Math.min(1000, rawLimit);
  const parsedDepartureFrom = departureFrom ? parseIsoDateOnly(departureFrom) : null;
  const parsedDepartureTo = departureTo ? parseIsoDateOnly(departureTo) : null;
  if ((departureFrom && !parsedDepartureFrom) || (departureTo && !parsedDepartureTo) || (parsedDepartureFrom && parsedDepartureTo && parsedDepartureFrom > parsedDepartureTo)) {
    return NextResponse.json({ error: { code: 'INVALID_DATE_RANGE', message: 'Departure dates must be a valid ascending YYYY-MM-DD range.' } }, { status: 422 });
  }
  if (afterId && !updatedSince) return NextResponse.json({ error: { code: 'INVALID_CURSOR', message: 'afterId requires updatedSince.' } }, { status: 422 });
  const updatedBoundary = updatedSince ? new Date(updatedSince) : null;
  if (updatedSince && (!updatedBoundary || !Number.isFinite(updatedBoundary.getTime()) || (afterId && !mongoose.Types.ObjectId.isValid(afterId)))) {
    return NextResponse.json({ error: { code: 'INVALID_CURSOR', message: 'The booking cursor is invalid.' } }, { status: 422 });
  }
  const [tourIds, tenant] = await Promise.all([
    Tour.find(buildStrictTenantQuery({ isPublished: true, archivedAt: null }, tenantId)).distinct('_id'),
    getTenantConfigCached(tenantId),
  ]);
  if (!tenant || tenant.isActive === false) return NextResponse.json({ error: { code: 'TENANT_NOT_FOUND', message: 'Tenant is unavailable.' } }, { status: 404 });
  if (requestedTourId && (!mongoose.Types.ObjectId.isValid(requestedTourId) || !tourIds.some((id) => String(id) === requestedTourId))) {
    return NextResponse.json({ error: { code: 'TOUR_NOT_FOUND', message: 'Tour is outside the RevenuePilot catalogue.' } }, { status: 404 });
  }
  const clauses: FilterQuery<IBooking>[] = [{ tenantId }, { tour: requestedTourId || { $in: tourIds } }];
  if (departureFrom || departureTo) {
    const dateRange = { ...(departureFrom ? { $gte: new Date(`${departureFrom}T00:00:00.000Z`) } : {}), ...(departureTo ? { $lte: new Date(`${departureTo}T23:59:59.999Z`) } : {}) };
    const stringRange = { ...(departureFrom ? { $gte: departureFrom } : {}), ...(departureTo ? { $lte: departureTo } : {}) };
    clauses.push({ $or: [{ date: dateRange }, { dateString: stringRange }] });
  }
  if (updatedBoundary) {
    clauses.push({ $or: afterId
      ? [{ updatedAt: { $gt: updatedBoundary } }, { updatedAt: updatedBoundary, _id: { $gt: afterId } }]
      : [{ updatedAt: { $gt: updatedBoundary } }] });
  }
  const query: FilterQuery<IBooking> = { $and: clauses };
  const rows = await Booking.find(query).select('_id tour date time adultGuests childGuests infantGuests totalPrice currency status selectedBookingOption createdAt updatedAt').sort({ updatedAt: 1, _id: 1 }).limit(limit).lean();
  const tenantCurrency = String(tenant.payments?.currency || 'USD').toUpperCase();
  return NextResponse.json({ tenantId, bookings: rows.map((row) => ({
    id: String(row._id), tourId: String(row.tour), date: new Date(row.date).toISOString().slice(0, 10), time: row.time,
    guests: { adult: row.adultGuests || 0, child: row.childGuests || 0, infant: row.infantGuests || 0 },
    totalPrice: row.totalPrice, currency: revenueBookingCurrency(row.currency, tenantCurrency), status: row.status,
    optionKey: row.selectedBookingOption?.pricingKey || null, bookedAt: row.createdAt, updatedAt: row.updatedAt,
  })), nextCursor: rows.length === limit ? { updatedSince: rows.at(-1)?.updatedAt, afterId: String(rows.at(-1)?._id) } : null }, { headers: { 'Cache-Control': 'no-store' } });
}
