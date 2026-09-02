import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import RevenuePriceExecution from '@/lib/models/RevenuePriceExecution';
import Tour from '@/lib/models/Tour';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';
import { guestPricesEqual } from '@/lib/revenue/guestPrices';
import { buildStrictTenantQuery } from '@/lib/tenant';
import { pricingProjectionStatus } from '@/lib/revenue/pricingSummary';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ executionId: string }> }) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  await dbConnect();
  const { executionId } = await context.params;
  const tenantId = auth.tenantId!;
  const receipt = await RevenuePriceExecution.findOne({ executionId, tenantId });
  if (!receipt) return revenueError(404, 'EXECUTION_NOT_FOUND', 'Execution not found.');
  const target = { tourId: String(receipt.target.tourId), optionKey: receipt.target.optionKey, date: receipt.target.date.toISOString().slice(0, 10), time: receipt.target.time, tenantId: receipt.tenantId };
  const effective = await resolveEffectivePrice(target);
  const matches = receipt.appliedVersion === effective.version && guestPricesEqual(receipt.effectivePrices, effective.prices) && receipt.currency === effective.currency;
  receipt.readbackAttempts = [...(receipt.readbackAttempts || []), { at: new Date(), matches, effective }].slice(-20);
  if (matches && receipt.state === 'applied') receipt.state = 'verified';
  await receipt.save();
  const tour = await Tour.findOne(buildStrictTenantQuery({ _id: receipt.target.tourId }, tenantId))
    .select('pricingSummaries pricingSearchProjections')
    .lean<{
      pricingSummaries?: Array<{ tenantId: string; version?: number }>;
      pricingSearchProjections?: Array<{
        tenantId: string;
        status?: 'pending' | 'syncing' | 'verified' | 'failed';
        summaryVersion?: number;
        authoritativeVersion?: number;
        nextAttemptAt?: Date;
        syncedAt?: Date;
        lastErrorCode?: string;
      }>;
    } | null>();
  const projection = pricingProjectionStatus(tour, tenantId, effective.version);
  const eeoDirectPropagation = projection.state;
  return NextResponse.json({
    state: receipt.state,
    receipt: receipt.toObject(),
    effective,
    verified: matches,
    fullyPropagated: matches && projection.verified,
    projectionVersionMatches: projection.versionMatches,
    channelPropagation: {
      eeo_direct: eeoDirectPropagation,
      getyourguide: 'not_connected',
      viator: 'not_connected',
    },
    pricingSearchProjection: tour?.pricingSearchProjections?.find((entry) => entry.tenantId === tenantId) || null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
