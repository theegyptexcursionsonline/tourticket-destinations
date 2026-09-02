import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
  if (auth instanceof NextResponse) return auth;

  const tenantId = request.nextUrl.searchParams.get('tenantId') || '';
  const tourId = request.nextUrl.searchParams.get('tourId') || '';
  const optionKey = request.nextUrl.searchParams.get('optionKey') || '';
  const date = request.nextUrl.searchParams.get('date') || '';
  const time = request.nextUrl.searchParams.get('time') || '';
  if (!tenantId || !tourId || !optionKey || !date || !time) {
    return NextResponse.json(
      { success: false, error: 'Brand, tour, option, date, and time are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (!canAccessTenant(auth, tenantId)) return tenantForbiddenResponse();

  try {
    await dbConnect();
    const quote = await resolveEffectivePrice({ tenantId, tourId, optionKey, date, time });
    return NextResponse.json(
      { success: true, quote },
      { headers: { 'Cache-Control': 'no-store, private' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to resolve price';
    const status = /Invalid|required/.test(message) ? 400 : /unavailable/i.test(message) ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
