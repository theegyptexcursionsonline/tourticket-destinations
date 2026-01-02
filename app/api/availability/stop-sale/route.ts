// app/api/availability/stop-sale/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { getTenantFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

type StopSalePayload = {
  tourId: string;
  optionIds?: string[]; // [] or undefined => all options
  startDate: string; // YYYY-MM-DD or ISO
  endDate: string; // YYYY-MM-DD or ISO
  reason?: string;
  tenantId?: string; // optional; defaults to request tenant
};

function toDateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function normalizeOptionIds(optionIds?: string[]) {
  const ids = Array.isArray(optionIds) ? optionIds.filter(Boolean) : [];
  const unique = Array.from(new Set(ids));
  return unique;
}

async function ensureTourOptionIds(tourId: string) {
  // Ensures tour.bookingOptions[].id exists (so stop-sale references are stable).
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

  if (changed) {
    await tour.save();
  }

  return tour;
}

/**
 * PUT: Apply stop-sale for a tour over a date range.
 * - optionIds omitted/empty => all options (stored as optionIds: [])
 * - optionIds provided => creates one stop-sale doc per optionId (stored as [optionId])
 */
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const body = (await request.json()) as StopSalePayload;

    const tourId = (body.tourId || '').trim();
    if (!tourId) {
      return NextResponse.json({ success: false, error: 'tourId is required' }, { status: 400 });
    }

    const tenantId = (body.tenantId || (await getTenantFromRequest()) || 'default').trim();
    const startDate = toDateOnly(new Date(body.startDate));
    const endDate = toDateOnly(new Date(body.endDate));

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid startDate/endDate' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ success: false, error: 'endDate must be >= startDate' }, { status: 400 });
    }

    const tour = await ensureTourOptionIds(tourId);
    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });
    }

    const optionIds = normalizeOptionIds(body.optionIds);
    const reason = (body.reason || '').trim();

    const ops: any[] = [];
    if (optionIds.length === 0) {
      // all options
      ops.push({
        updateOne: {
          filter: { tenantId, tourId, startDate, endDate, optionIds: [] },
          update: { $set: { tenantId, tourId, startDate, endDate, optionIds: [], reason } },
          upsert: true,
        },
      });
    } else {
      // one doc per optionId
      for (const optionId of optionIds) {
        ops.push({
          updateOne: {
            filter: { tenantId, tourId, startDate, endDate, optionIds: [optionId] },
            update: { $set: { tenantId, tourId, startDate, endDate, optionIds: [optionId], reason } },
            upsert: true,
          },
        });
      }
    }

    const result = await StopSale.bulkWrite(ops, { ordered: false });
    return NextResponse.json({
      success: true,
      data: {
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
        matched: result.matchedCount,
      },
    });
  } catch (error) {
    console.error('Error applying stop-sale:', error);
    return NextResponse.json({ success: false, error: 'Failed to apply stop-sale' }, { status: 500 });
  }
}

/**
 * DELETE: Remove stop-sale for a tour over a date range.
 * - optionIds omitted/empty => removes "all options" stop-sales for that range
 * - optionIds provided => removes those option-specific stop-sales for that range
 */
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const body = (await request.json()) as StopSalePayload;

    const tourId = (body.tourId || '').trim();
    if (!tourId) {
      return NextResponse.json({ success: false, error: 'tourId is required' }, { status: 400 });
    }

    const tenantId = (body.tenantId || (await getTenantFromRequest()) || 'default').trim();
    const startDate = toDateOnly(new Date(body.startDate));
    const endDate = toDateOnly(new Date(body.endDate));

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid startDate/endDate' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ success: false, error: 'endDate must be >= startDate' }, { status: 400 });
    }

    const optionIds = normalizeOptionIds(body.optionIds);

    let deleteFilter: Record<string, unknown>;
    if (optionIds.length === 0) {
      deleteFilter = { tenantId, tourId, startDate, endDate, optionIds: [] };
    } else {
      deleteFilter = { tenantId, tourId, startDate, endDate, optionIds: { $in: optionIds.map((id) => [id]) } };
    }

    const result = await StopSale.deleteMany(deleteFilter);
    return NextResponse.json({ success: true, data: { deleted: result.deletedCount } });
  } catch (error) {
    console.error('Error removing stop-sale:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove stop-sale' }, { status: 500 });
  }
}


