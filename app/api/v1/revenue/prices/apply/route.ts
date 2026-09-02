import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { applyPriceWrite, validatePriceWrite } from '@/lib/revenue/priceWrite';
import { requireRevenueIdempotencyKey, RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
import { revalidatePricingPaths } from '@/lib/revenue/revalidatePricing';
import { reconcileTourPricingProjection } from '@/lib/revenue/pricingSummary';
import { assertRevenuePilotCommissioningAllowed } from '@/lib/revenue/commissioningGate';
import { getTenantConfigCached } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Price apply failed.';

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const auth = await authenticateRevenueRequest(request, bodyText, 'write');
  if (auth.response) return auth.response;
  try {
    const idempotencyKey = requireRevenueIdempotencyKey(request.headers.get('idempotency-key'));
    const input = validatePriceWrite(JSON.parse(bodyText));
    if (input.tenantId !== auth.tenantId) return revenueError(403, 'TENANT_FORBIDDEN', 'The signed tenant and price-write tenant must match.');
    if (input.mode === 'commissioning') assertRevenuePilotCommissioningAllowed(input);
    else if (process.env.REVENUEPILOT_PRICING_API_ENABLED !== 'true') return revenueError(503, 'WRITES_DISABLED', 'RevenuePilot pricing writes are globally disabled.');
    await dbConnect();
    const tenant = await getTenantConfigCached(input.tenantId);
    if (!tenant || tenant.isActive === false) return revenueError(404, 'TENANT_NOT_FOUND', 'Tenant is unavailable.');
    const tenantCurrency = String(tenant.payments?.currency || 'USD').toUpperCase();
    if (input.currency !== tenantCurrency) return revenueError(422, 'CURRENCY_MISMATCH', 'The requested currency does not match the tenant checkout currency.');
    const result = await applyPriceWrite(input, idempotencyKey, bodyText);
    if (!result) throw new Error('Price execution returned no outcome.');
    if (result.state === 'conflict') return NextResponse.json(result, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    if (result.state === 'blocked') return NextResponse.json(result, { status: 422, headers: { 'Cache-Control': 'no-store' } });
    if (result.state === 'pending' || result.state === 'rollback_pending') return NextResponse.json(result, { status: 202, headers: { 'Cache-Control': 'no-store' } });
    if (result.state === 'rollback_failed') return NextResponse.json(result, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    let channelPropagation: Record<string, string> | undefined;
    let pricingProjection: { summaryRefreshed: boolean; searchSynced: boolean; authoritativeVersion: number } | undefined;
    if (['applied', 'replayed', 'rollback_applied'].includes(result.state)) {
      revalidatePricingPaths();
      const effective = 'effective' in result ? result.effective : null;
      const receipt = 'receipt' in result ? result.receipt : null;
      const authoritativeVersion = Math.max(0, Number(effective?.version ?? receipt?.appliedVersion ?? 0));
      const reconciled = await reconcileTourPricingProjection(input.target.tourId, input.tenantId, input.currency, authoritativeVersion);
      pricingProjection = {
        summaryRefreshed: reconciled.summaryRefreshed,
        searchSynced: reconciled.searchSynced,
        authoritativeVersion,
      };
      channelPropagation = {
        eeo_direct: reconciled.searchSynced ? 'verified' : 'failed',
        getyourguide: 'not_connected',
        viator: 'not_connected',
      };
    }
    return NextResponse.json(
      channelPropagation ? { ...result, channelPropagation, pricingProjection } : result,
      { status: result.state === 'replayed' || result.state === 'rollback_applied' ? 200 : 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: unknown) {
    if (error instanceof RevenuePricingWriteError) return revenueError(error.status, error.code, error.message);
    const message = errorMessage(error);
    const status = /outside policy corridor/.test(message) ? 422 : /Missing|Invalid|Only USD/.test(message) ? 400 : 500;
    return revenueError(status, status === 422 ? 'PRICE_BLOCKED_BY_POLICY' : 'PRICE_APPLY_FAILED', message);
  }
}
