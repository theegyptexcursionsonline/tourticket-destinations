import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { rollbackPriceExecution } from '@/lib/revenue/priceRollback';
import { requireRevenueIdempotencyKey, RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
import { revalidatePricingPaths } from '@/lib/revenue/revalidatePricing';
import { reconcileTourPricingProjection } from '@/lib/revenue/pricingSummary';
import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ executionId: string }> }) {
  const bodyText = await request.text();
  const auth = await authenticateRevenueRequest(request, bodyText, 'write');
  if (auth.response) return auth.response;

  try {
    const idempotencyKey = requireRevenueIdempotencyKey(request.headers.get('idempotency-key'));
    await dbConnect();
    const { executionId } = await context.params;
    const result = await rollbackPriceExecution(executionId, idempotencyKey, bodyText, auth.tenantId!);

    let channelPropagation: Record<string, string> | undefined;
    let pricingProjection: { summaryRefreshed: boolean; searchSynced: boolean; authoritativeVersion: number } | undefined;
    if (result.state === 'rollback_applied') {
      const receipt = result.receipt;
      const effective = await resolveEffectivePrice({
        tenantId: receipt.tenantId,
        tourId: String(receipt.target.tourId),
        optionKey: receipt.target.optionKey,
        date: new Date(receipt.target.date).toISOString().slice(0, 10),
        time: receipt.target.time,
      });
      revalidatePricingPaths();
      const reconciled = await reconcileTourPricingProjection(String(receipt.target.tourId), receipt.tenantId, receipt.currency, effective.version);
      pricingProjection = {
        summaryRefreshed: reconciled.summaryRefreshed,
        searchSynced: reconciled.searchSynced,
        authoritativeVersion: effective.version,
      };
      channelPropagation = {
        eeo_direct: reconciled.searchSynced ? 'verified' : 'failed',
        getyourguide: 'not_connected',
        viator: 'not_connected',
      };
    }

    const status = result.state === 'rollback_pending' ? 202 : result.state === 'rollback_failed' ? 409 : 200;
    return NextResponse.json(channelPropagation ? { ...result, channelPropagation, pricingProjection } : result, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    if (error instanceof RevenuePricingWriteError) return revenueError(error.status, error.code, error.message);
    return revenueError(500, 'ROLLBACK_FAILED', error instanceof Error ? error.message : 'Rollback failed.');
  }
}
