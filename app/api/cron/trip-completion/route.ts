// app/api/cron/trip-completion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendTripCompletionEmails } from '@/lib/jobs/emailJobs';
import { requireCronSecret } from '@/lib/security/cronAuth';

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await sendTripCompletionEmails();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to send trip completion emails' },
      { status: 500 }
    );
  }
}
