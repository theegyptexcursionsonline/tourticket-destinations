import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  const tourId = request.nextUrl.searchParams.get('tourId') || '';
  const optionKey = request.nextUrl.searchParams.get('optionKey') || 'standard';
  const date = request.nextUrl.searchParams.get('date') || '';
  const time = request.nextUrl.searchParams.get('time') || '';
  if (!tourId || !date || !time) return revenueError(400, 'INVALID_QUOTE_TARGET', 'tourId, date and time are required.');
  try {
    await dbConnect();
    const effective = await resolveEffectivePrice({ tourId, optionKey, date, time, tenantId: auth.tenantId! });
    return NextResponse.json({ tenantId: auth.tenantId, effective }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    return revenueError(400, 'EFFECTIVE_PRICE_UNAVAILABLE', error instanceof Error ? error.message : 'Effective price unavailable.');
  }
}
