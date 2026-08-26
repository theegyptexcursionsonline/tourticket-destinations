import { NextRequest, NextResponse } from 'next/server';
import { verifyContentEngine } from '@/lib/auth/verifyContentEngine';
import { getContentEngineCapabilities } from '@/lib/content-engine/receiverContract';

export async function GET(request: NextRequest) {
  const authError = verifyContentEngine(request, { registerAuditActor: false });
  if (authError) return authError;
  return NextResponse.json(getContentEngineCapabilities());
}
