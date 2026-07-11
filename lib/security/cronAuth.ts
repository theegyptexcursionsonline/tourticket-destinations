import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export function requireCronSecret(request: NextRequest): NextResponse | null {
  const configured = process.env.CRON_SECRET;
  if (!configured || configured.length < 16) {
    return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 });
  }
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
