// app/api/admin/availability/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Availability from '@/lib/models/Availability';
import Tour from '@/lib/models/Tour';
import StopSale from '@/lib/models/StopSale';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

// GET - Fetch availability for a tour/month
export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId');
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const tenantId = searchParams.get('tenantId');

    // Build query
    const query: Record<string, unknown> = {};
    
    if (tourId) {
      query.tour = tourId;
    }
    
    if (tenantId && tenantId !== 'all') {
      query.tenantId = tenantId;
    }

    // Date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    query.date = { $gte: startDate, $lte: endDate };

    const availability = await Availability.find(query)
      .populate('tour', 'title slug tenantId bookingOptions')
      .sort({ date: 1 })
      .lean();

    // Option-level stop-sale enrichment (for calendar coloring + details)
    const stopSaleByDate: Record<
      string,
      { status: 'none' | 'partial' | 'full'; stoppedOptionIds: string[]; reasons: Record<string, string> }
    > = {};

    const toDateOnly = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const toKey = (d: Date) => new Date(d).toISOString().split('T')[0];

    if (tourId) {
      // Determine tenant for stop-sale lookups:
      // - If explicitly filtered by tenantId, use that
      // - Otherwise, use the tour's tenant (safer than cross-tenant mixing)
      let effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;

      const tourDoc = await Tour.findById(tourId).select('tenantId title bookingOptions');
      if (tourDoc) {
        if (!effectiveTenantId) effectiveTenantId = tourDoc.tenantId;

        // Ensure bookingOptions[].id exists (needed for option-level stop-sale)
        let changed = false;
        if (Array.isArray(tourDoc.bookingOptions)) {
          tourDoc.bookingOptions = tourDoc.bookingOptions.map((opt: any) => {
            if (!opt) return opt;
            if (!opt.id) {
              changed = true;
              return {
                ...opt,
                id: globalThis.crypto?.randomUUID?.() || `opt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              };
            }
            return opt;
          });
        }
        if (changed) await tourDoc.save();

        const optionIds: string[] = Array.isArray(tourDoc.bookingOptions)
          ? tourDoc.bookingOptions.map((o: any) => o?.id).filter(Boolean)
          : [];

        // Initialize all days of month to "none" so UI can rely on presence
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const key = toKey(d);
          stopSaleByDate[key] = { status: 'none', stoppedOptionIds: [], reasons: {} };
        }

        const stopSales = await StopSale.find({
          tenantId: effectiveTenantId,
          tourId,
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        })
          .select('optionIds startDate endDate reason')
          .lean();

        for (const ss of stopSales) {
          const ssStart = toDateOnly(new Date(ss.startDate));
          const ssEnd = toDateOnly(new Date(ss.endDate));

          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const day = toDateOnly(d);
            if (day < ssStart || day > ssEnd) continue;

            const key = toKey(day);
            if (!stopSaleByDate[key]) continue;

            if (!Array.isArray(ss.optionIds) || ss.optionIds.length === 0) {
              stopSaleByDate[key].status = 'full';
              stopSaleByDate[key].stoppedOptionIds = [];
              if (ss.reason) stopSaleByDate[key].reasons['all'] = ss.reason;
              continue;
            }

            const optId = ss.optionIds[0];
            if (stopSaleByDate[key].status !== 'full' && optId) {
              stopSaleByDate[key].stoppedOptionIds.push(optId);
              if (ss.reason) stopSaleByDate[key].reasons[optId] = ss.reason;
              stopSaleByDate[key].status = 'partial';
            }
          }
        }

        // De-dupe and upgrade partial->full if all options stopped
        for (const key of Object.keys(stopSaleByDate)) {
          stopSaleByDate[key].stoppedOptionIds = Array.from(new Set(stopSaleByDate[key].stoppedOptionIds));
          if (stopSaleByDate[key].status === 'partial' && optionIds.length > 0) {
            const allStopped = stopSaleByDate[key].stoppedOptionIds.length >= optionIds.length;
            if (allStopped) {
              stopSaleByDate[key].status = 'full';
              stopSaleByDate[key].stoppedOptionIds = [];
            }
          }
        }
      }
    }

    // Merge stop-sale info into availability list; also surface legacy Availability.stopSale as full stop-sale.
    const availabilityByDate = new Map<string, any>();
    for (const item of availability) {
      const key = toKey(new Date(item.date));
      const stopSaleInfo = stopSaleByDate[key] || { status: 'none', stoppedOptionIds: [], reasons: {} };
      const legacyFull = Boolean(item.stopSale);
      const merged = {
        ...item,
        stopSaleStatus: legacyFull ? 'full' : stopSaleInfo.status,
        stoppedOptionIds: legacyFull ? [] : stopSaleInfo.stoppedOptionIds,
        stopSaleReasons: legacyFull
          ? { all: item.stopSaleReason || 'Blocked' }
          : stopSaleInfo.reasons,
      };
      availabilityByDate.set(key, merged);
    }

    // Add synthetic records for dates that only have stop-sale (no Availability doc yet)
    for (const [key, ssInfo] of Object.entries(stopSaleByDate)) {
      if (ssInfo.status === 'none') continue;
      if (availabilityByDate.has(key)) continue;

      availabilityByDate.set(key, {
        _id: `stop-sale-${tourId}-${key}`,
        tour: tourId ? { _id: tourId, title: 'Tour' } : undefined,
        date: key,
        slots: [],
        stopSale: false,
        stopSaleReason: '',
        stopSaleStatus: ssInfo.status,
        stoppedOptionIds: ssInfo.stoppedOptionIds,
        stopSaleReasons: ssInfo.reasons,
      });
    }

    const enrichedAvailability = Array.from(availabilityByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);

    return NextResponse.json({
      success: true,
      data: enrichedAvailability,
      meta: { month, year, count: enrichedAvailability.length },
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

// POST - Create or update availability
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const body = await request.json();
    const { tourId, date, slots, stopSale, stopSaleReason, tenantId, notes } = body;

    if (!tourId || !date || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tour ID, date, and tenant ID are required' },
        { status: 400 }
      );
    }

    // Verify tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json(
        { success: false, error: 'Tour not found' },
        { status: 404 }
      );
    }

    // Parse date
    const availabilityDate = new Date(date);
    availabilityDate.setHours(0, 0, 0, 0);

    // Upsert availability
    const availability = await Availability.findOneAndUpdate(
      { tour: tourId, date: availabilityDate },
      {
        tour: tourId,
        date: availabilityDate,
        slots: slots || [],
        stopSale: stopSale || false,
        stopSaleReason: stopSaleReason || '',
        tenantId,
        notes: notes || '',
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Mirror legacy tour-level stopSale boolean into StopSale model (all options)
    // so that public/frontend checks can respect it.
    if (stopSale) {
      await StopSale.findOneAndUpdate(
        { tenantId, tourId, startDate: availabilityDate, endDate: availabilityDate, optionIds: [] },
        {
          $set: {
            tenantId,
            tourId,
            startDate: availabilityDate,
            endDate: availabilityDate,
            optionIds: [],
            reason: stopSaleReason || 'Blocked',
          },
        },
        { upsert: true },
      );
    } else {
      await StopSale.deleteMany({ tenantId, tourId, startDate: availabilityDate, endDate: availabilityDate, optionIds: [] });
    }

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('Error creating availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create availability' },
      { status: 500 }
    );
  }
}

// PUT - Bulk update availability
export async function PUT(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const body = await request.json();
    const { tourId, dates, action, tenantId, slots, stopSale, stopSaleReason } = body;

    if (!tourId || !dates || !Array.isArray(dates) || !action || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tour ID, dates array, action, and tenant ID are required' },
        { status: 400 }
      );
    }

    const operations = [];
    const stopSaleOps: any[] = [];

    for (const dateStr of dates) {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);

      const updateData: Record<string, unknown> = { tenantId };

      switch (action) {
        case 'block':
          updateData.stopSale = true;
          updateData.stopSaleReason = stopSaleReason || 'Blocked';
          stopSaleOps.push({
            updateOne: {
              filter: { tenantId, tourId, startDate: date, endDate: date, optionIds: [] },
              update: {
                $set: { tenantId, tourId, startDate: date, endDate: date, optionIds: [], reason: stopSaleReason || 'Blocked' },
              },
              upsert: true,
            },
          });
          break;
        case 'unblock':
          updateData.stopSale = false;
          updateData.stopSaleReason = '';
          stopSaleOps.push({
            deleteOne: {
              filter: { tenantId, tourId, startDate: date, endDate: date, optionIds: [] },
            },
          });
          break;
        case 'updateSlots':
          if (slots) updateData.slots = slots;
          break;
        case 'setStopSale':
          updateData.stopSale = stopSale;
          updateData.stopSaleReason = stopSaleReason || '';
          if (stopSale) {
            stopSaleOps.push({
              updateOne: {
                filter: { tenantId, tourId, startDate: date, endDate: date, optionIds: [] },
                update: {
                  $set: { tenantId, tourId, startDate: date, endDate: date, optionIds: [], reason: stopSaleReason || '' },
                },
                upsert: true,
              },
            });
          } else {
            stopSaleOps.push({
              deleteOne: {
                filter: { tenantId, tourId, startDate: date, endDate: date, optionIds: [] },
              },
            });
          }
          break;
      }

      operations.push({
        updateOne: {
          filter: { tour: tourId, date },
          update: { $set: { ...updateData, tour: tourId, date } },
          upsert: true,
        },
      });
    }

    const result = await Availability.bulkWrite(operations);
    if (stopSaleOps.length > 0) {
      await StopSale.bulkWrite(stopSaleOps, { ordered: false });
    }

    return NextResponse.json({
      success: true,
      data: {
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      },
    });
  } catch (error) {
    console.error('Error bulk updating availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk update availability' },
      { status: 500 }
    );
  }
}

