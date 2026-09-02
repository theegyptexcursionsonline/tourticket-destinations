import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import RevenueMachineNonce from '@/lib/models/RevenueMachineNonce';
import { configuredRevenuePilotMachineKeys, revenuePilotMachineScopes, revenuePilotMachineTenants } from '@/lib/auth/revenuePilotMachineConfig';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function revenueBodyHash(bodyText = '') {
  return createHash('sha256').update(bodyText).digest('hex');
}

export function revenueCanonicalRequest(request: NextRequest, timestamp: string, nonce: string, bodyText = '') {
  return [timestamp, nonce, request.method.toUpperCase(), `${request.nextUrl.pathname}${request.nextUrl.search}`, revenueBodyHash(bodyText)].join('\n');
}

export function validateRevenuePilotSignature(request: NextRequest, bodyText = '', requiredScope: 'read' | 'write' = 'read'): { ok: true; keyId: string; tenantId: string } | { ok: false; status: number; code: string } {
  const keyId = request.headers.get('x-rp-key-id')?.trim() || '';
  const timestamp = request.headers.get('x-rp-timestamp')?.trim() || '';
  const nonce = request.headers.get('x-rp-nonce')?.trim() || '';
  const presented = request.headers.get('x-rp-signature')?.trim() || '';
  const secret = configuredRevenuePilotMachineKeys().get(keyId);
  const timestampMs = Number(timestamp);
  const tenantValues = request.nextUrl.searchParams.getAll('tenantId');
  const tenantId = tenantValues.length === 1 ? tenantValues[0].trim() : '';

  if (!secret || !nonce || nonce.length > 120 || !Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, status: 401, code: 'MACHINE_UNAUTHORIZED' };
  }
  if (!revenuePilotMachineScopes(keyId).has(requiredScope)) {
    return { ok: false, status: 403, code: 'MACHINE_SCOPE_FORBIDDEN' };
  }
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId) || !revenuePilotMachineTenants(keyId).has(tenantId)) {
    return { ok: false, status: 403, code: 'MACHINE_TENANT_FORBIDDEN' };
  }
  const expected = createHmac('sha256', secret).update(revenueCanonicalRequest(request, timestamp, nonce, bodyText)).digest('hex');
  if (!/^[a-f0-9]{64}$/i.test(presented) || !timingSafeEqual(Buffer.from(presented, 'ascii'), Buffer.from(expected, 'ascii'))) {
    return { ok: false, status: 401, code: 'MACHINE_UNAUTHORIZED' };
  }
  return { ok: true, keyId, tenantId };
}

export async function claimRevenueNonce(keyId: string, nonce: string) {
  await dbConnect();
  try {
    await RevenueMachineNonce.create({ keyId, nonce, expiresAt: new Date(Date.now() + MAX_CLOCK_SKEW_MS) });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) return false;
    throw error;
  }
  return true;
}

export async function verifyRevenuePilot(request: NextRequest, bodyText = '', requiredScope: 'read' | 'write' = 'read'): Promise<{ keyId: string; tenantId: string } | NextResponse> {
  const validation = validateRevenuePilotSignature(request, bodyText, requiredScope);
  if (!validation.ok) {
    const message = validation.code === 'MACHINE_SCOPE_FORBIDDEN'
      ? 'This machine identity does not have the required scope.'
      : validation.code === 'MACHINE_TENANT_FORBIDDEN'
        ? 'This machine identity is not allowed to access the requested tenant.'
        : 'Valid machine authentication is required.';
    return NextResponse.json({ error: { code: validation.code, message } }, { status: validation.status });
  }
  const nonce = request.headers.get('x-rp-nonce')!.trim();
  if (!await claimRevenueNonce(validation.keyId, nonce)) return NextResponse.json({ error: { code: 'MACHINE_REPLAY', message: 'This signed request was already used.' } }, { status: 409 });
  return { keyId: validation.keyId, tenantId: validation.tenantId };
}
