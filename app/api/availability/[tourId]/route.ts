// app/api/availability/[tourId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { getTenantFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function toDateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

async function ensureTourOptionIds(tourId: string) {
  const tour = await Tour.findById(tourId);
  if (!tour) return null;

  let changed = false;
  if (Array.isArray(tour.bookingOptions)) {
    tour.bookingOptions = tour.bookingOptions.map((opt: any) => {
      if (!opt) return opt;
      if (!opt.id) {
        changed = true;
        return { ...opt, id: globalThis.crypto?.randomUUID?.() || `opt-${Date.now()}-${Math.random().toString(16).slice(2)}` };
      }
      return opt;
    });
  }
  if (changed) await tour.save();
  return tour;
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

    const tour = await ensureTourOptionIds(tourId);
    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });
    }

    const options = Array.isArray(tour.bookingOptions)
      ? tour.bookingOptions
          .filter((o: any) => o && (o.id || o.label))
          .map((o: any) => ({
            id: o.id,
            label: o.label || o.type || 'Option',
          }))
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
      rangeStart = toDateOnly(new Date(year, month - 1, 1));
      rangeEnd = toDateOnly(new Date(year, month, 0));
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

    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      const key = toDateKey(d);
      days[key] = { status: 'none', stoppedOptionIds: [], reasons: {} };
    }

    // Aggregate stop-sales per day
    for (const ss of stopSales) {
      const ssStart = toDateOnly(new Date(ss.startDate));
      const ssEnd = toDateOnly(new Date(ss.endDate));

      for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
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
      },
    });
  } catch (error) {
    console.error('Error fetching availability stop-sale:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch availability' }, { status: 500 });
  }
}


