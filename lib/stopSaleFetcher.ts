// Server-side stop-sale fetcher.
//
// Runs the same aggregation the /api/availability/[tourId] route does, but
// called in-process from Server Components so the tour detail page can
// pre-hydrate BookingSidebar's stop-sale state. Without this, the calendar
// had to make 6 client-side fetches on mount, and on slow connections the
// loading window was long enough to be noticed.

import dbConnect from '@/lib/dbConnect';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { buildTenantQuery } from '@/lib/tenant';

function toDateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

// Returns a YYYY-MM-DD-keyed map covering today + the next `monthsAhead`
// months. Only dates that are stop-saled appear.
export async function getStopSaleDatesForTour(
  tourId: string,
  tenantId: string,
  monthsAhead = 6,
): Promise<Record<string, 'full' | 'partial'>> {
  if (!tourId) return {};

  try {
    await dbConnect();

    const today = toDateOnly(new Date());
    const rangeEnd = new Date(today);
    rangeEnd.setMonth(rangeEnd.getMonth() + monthsAhead);

    const stopSaleQuery = buildTenantQuery(
      {
        tourId,
        startDate: { $lte: rangeEnd },
        endDate: { $gte: today },
      },
      tenantId,
    );

    const [stopSales, tour] = await Promise.all([
      StopSale.find(stopSaleQuery)
        .select('optionIds startDate endDate reason')
        .lean(),
      Tour.findById(tourId).select('bookingOptions').lean(),
    ]);

    if (stopSales.length === 0) return {};

    const tourOptionIds = Array.isArray((tour as any)?.bookingOptions)
      ? (tour as any).bookingOptions
          .map(
            (option: any, index: number) =>
              option?.id || option?._id?.toString?.() || `option-${index}`,
          )
          .filter(Boolean)
      : [];

    // Mirror the API aggregation in app/api/availability/[tourId]/route.ts.
    const days: Record<
      string,
      { status: 'full' | 'partial'; stoppedOptionIds: string[] }
    > = {};

    for (const ss of stopSales) {
      const ssStart = toDateOnly(new Date(ss.startDate));
      const ssEnd = toDateOnly(new Date(ss.endDate));
      const windowStart = ssStart > today ? ssStart : today;
      const windowEnd = ssEnd < rangeEnd ? ssEnd : rangeEnd;

      for (
        let d = new Date(windowStart);
        d <= windowEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const key = toDateKey(d);

        if (!Array.isArray(ss.optionIds) || ss.optionIds.length === 0) {
          days[key] = { status: 'full', stoppedOptionIds: [] };
          continue;
        }

        const existing =
          days[key] || { status: 'partial' as const, stoppedOptionIds: [] as string[] };
        if (existing.status === 'full') continue;
        existing.stoppedOptionIds.push(...ss.optionIds);
        existing.status = 'partial';
        days[key] = existing;
      }
    }

    const result: Record<string, 'full' | 'partial'> = {};
    for (const [key, info] of Object.entries(days)) {
      if (info.status === 'full') {
        result[key] = 'full';
        continue;
      }
      const deduped = Array.from(new Set(info.stoppedOptionIds));
      if (
        tourOptionIds.length > 0 &&
        tourOptionIds.every((optionId: string) => deduped.includes(optionId))
      ) {
        result[key] = 'full';
      } else {
        result[key] = 'partial';
      }
    }

    return result;
  } catch (err) {
    console.warn('[stopSaleFetcher] failed:', err);
    return {};
  }
}
