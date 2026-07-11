// app/api/cron/trip-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendTripReminders } from '@/lib/jobs/emailJobs';
import { requireCronSecret } from '@/lib/security/cronAuth';

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await sendTripReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to send trip reminders' },
      { status: 500 }
    );
  }
}
