import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireCronSecret } from '@/lib/security/cronAuth';
import { refreshExpiredPricingSummaries } from '@/lib/revenue/pricingSummary';

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    await dbConnect();
    const result = await refreshExpiredPricingSummaries();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Pricing summary cron failed.', error);
    return NextResponse.json({ success: false, error: 'Pricing summary refresh failed' }, { status: 500 });
  }
}
