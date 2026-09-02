import { NextRequest, NextResponse } from 'next/server';
import { verifyRevenuePilot } from '@/lib/auth/verifyRevenuePilot';

export async function authenticateRevenueRequest(request: NextRequest, bodyText = '', requiredScope: 'read' | 'write' = 'read') {
  const authentication = await verifyRevenuePilot(request, bodyText, requiredScope);
  if (authentication instanceof NextResponse) return { response: authentication, keyId: null, tenantId: null };
  return { response: null, keyId: authentication.keyId, tenantId: authentication.tenantId };
}

export function revenueError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });
}
