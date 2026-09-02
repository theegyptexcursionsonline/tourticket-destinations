import { NextResponse } from 'next/server';
import { revenuePilotPricingReadiness } from '@/lib/revenue/pricingReadiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(revenuePilotPricingReadiness(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

