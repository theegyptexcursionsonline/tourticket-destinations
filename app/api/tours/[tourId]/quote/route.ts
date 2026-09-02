import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';
import { getTenantFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ tourId: string }> }) {
  try {
    await dbConnect();
    const [{ tourId }, tenantId] = await Promise.all([
      context.params,
      request.headers.get('x-tenant-id') || getTenantFromRequest(),
    ]);
    const date = request.nextUrl.searchParams.get('date') || '';
    const time = request.nextUrl.searchParams.get('time') || '';
    const optionKey = request.nextUrl.searchParams.get('optionKey') || 'standard';
    if (!date || !time) {
      return NextResponse.json({ error: { code: 'INVALID_QUOTE_TARGET', message: 'date and time are required.' } }, { status: 400 });
    }
    const quote = await resolveEffectivePrice({ tourId, date, time, optionKey, tenantId });
    return NextResponse.json({ quote }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to resolve price';
    const status = /Invalid|required/.test(message) ? 400 : /unavailable/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: { code: 'QUOTE_UNAVAILABLE', message } }, { status });
  }
}
