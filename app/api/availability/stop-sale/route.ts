// app/api/availability/stop-sale/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StopSale from '@/lib/models/StopSale';
import StopSaleLog from '@/lib/models/StopSaleLog';
import Tour from '@/lib/models/Tour';
import { getTenantFromRequest } from '@/lib/tenant';
import { requireAdminAuth, AdminAuthContext } from '@/lib/auth/adminAuth';

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
 * Create log entries for stop-sale actions
 */
async function createStopSaleLogs(
  tenantId: string,
  tourId: string,
  optionIds: string[],
  startDate: Date,
  endDate: Date,
  reason: string,
  userId: string,
) {
  const logs = [];
  const now = new Date();

  if (optionIds.length === 0) {
    // All options - single log entry
    logs.push({
      tourId,
      optionId: null,
      dateFrom: startDate,
      dateTo: endDate,
      reason,
      appliedBy: userId,
      appliedAt: now,
      status: 'active',
      tenantId,
    });
  } else {
    // One log entry per option
    for (const optionId of optionIds) {
      logs.push({
        tourId,
        optionId,
        dateFrom: startDate,
        dateTo: endDate,
        reason,
        appliedBy: userId,
        appliedAt: now,
        status: 'active',
        tenantId,
      });
    }
  }

  if (logs.length > 0) {
    await StopSaleLog.insertMany(logs);
  }
}

/**
 * Mark log entries as removed
 */
async function markLogsAsRemoved(
  tenantId: string,
  tourId: string,
  optionIds: string[],
  startDate: Date,
  endDate: Date,
  userId: string,
) {
  const now = new Date();
  
  const filter: Record<string, unknown> = {
    tenantId,
    tourId,
    dateFrom: startDate,
    dateTo: endDate,
    status: 'active',
  };

  if (optionIds.length === 0) {
    // All options
    filter.optionId = null;
  } else {
    // Specific options
    filter.optionId = { $in: optionIds };
  }

  await StopSaleLog.updateMany(filter, {
    $set: {
      status: 'removed',
      removedBy: userId,
      removedAt: now,
    },
  });
}

/**
 * PUT: Apply stop-sale for a tour over a date range.
 * - optionIds omitted/empty => all options (stored as optionIds: [])
 * - optionIds provided => creates one stop-sale doc per optionId (stored as [optionId])
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await requireAdminAuth(request, { permissions: ['manageTours'] });
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const auth = authResult as AdminAuthContext;

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

    // Create log entries for this stop-sale action
    await createStopSaleLogs(tenantId, tourId, optionIds, startDate, endDate, reason, auth.userId);

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
    // Authenticate admin user
    const authResult = await requireAdminAuth(request, { permissions: ['manageTours'] });
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const auth = authResult as AdminAuthContext;

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

    // Mark log entries as removed
    await markLogsAsRemoved(tenantId, tourId, optionIds, startDate, endDate, auth.userId);

    return NextResponse.json({ success: true, data: { deleted: result.deletedCount } });
  } catch (error) {
    console.error('Error removing stop-sale:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove stop-sale' }, { status: 500 });
  }
}
