import { futureCatalogueTimes, DepartureConfigurationError } from '@/lib/bookings/departureAdmission';
// app/api/availability/[tourId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantFromRequest, getTenantConfigCached } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function toDateOnly(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ tourId: string }> }) {
  try {
    await dbConnect();
    const { tourId } = await params;

    const { searchParams } = new URL(request.url);
    const tenantId = (searchParams.get('tenantId') || (await getTenantFromRequest()) || 'default').trim();

    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const monthParam = searchParams.get('month'); // 1-12
    const yearParam = searchParams.get('year'); // yyyy

    const tour = await Tour.findOne(buildStrictTenantQuery({ _id: tourId, isPublished: true, archivedAt: null }, tenantId));
    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });
    }

    const tenant = await getTenantConfigCached(tenantId);
    if (!tenant?.localization?.defaultTimezone) return NextResponse.json({ success: false, error: 'Booking timezone unavailable' }, { status: 503 });
    const availableTimesByDate: Record<string, Record<string, string[]>> = {};

    const options = Array.isArray(tour.bookingOptions)
      ? tour.bookingOptions
          .flatMap((o: any, index: number) => o && (o.id || o.label) ? [{
            id: String(o.id || o._id || `option-${index}`),
            label: o.label || o.type || 'Option',
          }] : [])
      : [];

    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (dateParam) {
      const d = toDateOnly(new Date(dateParam));
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 });
      }
      rangeStart = d;
      rangeEnd = d;
    } else if (monthParam && yearParam) {
      const month = Number.parseInt(monthParam, 10);
      const year = Number.parseInt(yearParam, 10);
      if (!month || month < 1 || month > 12 || !year) {
        return NextResponse.json({ success: false, error: 'Invalid month/year' }, { status: 400 });
      }
      rangeStart = toDateOnly(new Date(Date.UTC(year, month - 1, 1)));
      rangeEnd = toDateOnly(new Date(Date.UTC(year, month, 0)));
    } else {
      return NextResponse.json(
        { success: false, error: 'Provide either ?date=YYYY-MM-DD or ?month=MM&year=YYYY' },
        { status: 400 },
      );
    }

    const stopSales = await StopSale.find({
      tenantId,
      tourId,
      startDate: { $lte: rangeEnd },
      endDate: { $gte: rangeStart },
    })
      .select('optionIds startDate endDate reason')
      .lean();

    const days: Record<
      string,
      { status: 'none' | 'partial' | 'full'; stoppedOptionIds: string[]; reasons: Record<string, string> }
    > = {};

    for (let d = new Date(rangeStart); d <= rangeEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = toDateKey(d);
      days[key] = { status: 'none', stoppedOptionIds: [], reasons: {} };
    }

    // Aggregate stop-sales per day
    for (const ss of stopSales) {
      const ssStart = toDateOnly(new Date(ss.startDate));
      const ssEnd = toDateOnly(new Date(ss.endDate));

      for (let d = new Date(rangeStart); d <= rangeEnd; d.setUTCDate(d.getUTCDate() + 1)) {
        const day = toDateOnly(d);
        if (day < ssStart || day > ssEnd) continue;

        const key = toDateKey(day);
        if (!days[key]) continue;

        if (!Array.isArray(ss.optionIds) || ss.optionIds.length === 0) {
          days[key].status = 'full';
          days[key].stoppedOptionIds = [];
          if (ss.reason) days[key].reasons['all'] = ss.reason;
          continue;
        }

        // single optionId per doc (by convention)
        const optionId = ss.optionIds[0];
        if (days[key].status !== 'full' && optionId) {
          days[key].stoppedOptionIds.push(optionId);
          if (ss.reason) days[key].reasons[optionId] = ss.reason;
          days[key].status = 'partial';
        }
      }
    }

    // Departure admission is independent of capacity overrides or stop-sale rows.
    for (const key of Object.keys(days)) {
      const times = futureCatalogueTimes(tour, key, tenant.localization.defaultTimezone);
      availableTimesByDate[key] = times;
      const expired = Object.entries(times).filter(([, values]) => values.length === 0).map(([id]) => id);
      for (const id of expired) {
        days[key].stoppedOptionIds.push(id);
        days[key].reasons[id] = 'No future departures are available for this date.';
      }
      if (expired.length === Object.keys(times).length) {
        days[key].status = 'full';
        days[key].reasons.all = 'No future departures are available for this date.';
      } else if (expired.length && days[key].status !== 'full') days[key].status = 'partial';
    }

    // De-dupe stoppedOptionIds
    for (const key of Object.keys(days)) {
      days[key].stoppedOptionIds = Array.from(new Set(days[key].stoppedOptionIds));
      if (days[key].status === 'partial' && options.length > 0) {
        const allStopped = days[key].stoppedOptionIds.length >= options.length;
        if (allStopped) {
          days[key].status = 'full';
          days[key].stoppedOptionIds = [];
        }
      }
    }

    // If single date requested, flatten response for convenience
    if (dateParam) {
      const key = dateParam;
      return NextResponse.json({
        success: true,
        data: {
          tourId,
          date: key,
          availableTimesByOption: availableTimesByDate[key],
          options,
          stopSaleStatus: days[key]?.status || 'none',
          stoppedOptionIds: days[key]?.stoppedOptionIds || [],
          reasons: days[key]?.reasons || {},
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        tourId,
        options,
        days,
        availableTimesByDate,
      },
    });
  } catch (error) {
    if (error instanceof DepartureConfigurationError) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    console.error('Error fetching availability stop-sale:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch availability' }, { status: 500 });
  }
}


