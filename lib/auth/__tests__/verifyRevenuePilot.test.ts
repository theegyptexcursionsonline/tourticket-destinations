import { createHmac } from 'node:crypto';
import type { NextRequest } from 'next/server';
import {
  claimRevenueNonce,
  revenueBodyHash,
  revenueCanonicalRequest,
  validateRevenuePilotSignature,
} from '@/lib/auth/verifyRevenuePilot';
import RevenueMachineNonce from '@/lib/models/RevenueMachineNonce';

jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));
jest.mock('@/lib/models/RevenueMachineNonce', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));

describe('RevenuePilot tenant-bound machine signature contract', () => {
  const secret = '0123456789abcdef0123456789abcdef';
  const originalEnv = { ...process.env };

  const signedRequest = ({
    scope = 'read',
    tenantId = 'mountain-tours',
    signatureOverride,
    timestamp = String(Date.now()),
    nonce = `nonce-${Math.random()}`,
  }: {
    scope?: string;
    tenantId?: string;
    signatureOverride?: string;
    timestamp?: string;
    nonce?: string;
  } = {}) => {
    process.env.REVENUEPILOT_HMAC_KEYS = `primary:${secret}`;
    process.env.REVENUEPILOT_HMAC_SCOPES = `primary=${scope}`;
    process.env.REVENUEPILOT_HMAC_TENANTS = 'primary=mountain-tours|default';
    const body = '{"a":1}';
    const search = `?tenantId=${encodeURIComponent(tenantId)}&x=1`;
    const canonical = [timestamp, nonce, 'POST', `/api/v1/revenue/catalog${search}`, revenueBodyHash(body)].join('\n');
    const signature = signatureOverride ?? createHmac('sha256', secret).update(canonical).digest('hex');
    const request = {
      method: 'POST',
      nextUrl: {
        pathname: '/api/v1/revenue/catalog',
        search,
        searchParams: new URLSearchParams(search),
      },
      headers: new Headers({
        'x-rp-key-id': 'primary',
        'x-rp-timestamp': timestamp,
        'x-rp-nonce': nonce,
        'x-rp-signature': signature,
      }),
    } as unknown as NextRequest;
    return { request, body };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(RevenueMachineNonce.create).mockResolvedValue({} as never);
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  it('hashes the exact body and signs the full query-bearing path', () => {
    const request = {
      method: 'POST',
      nextUrl: { pathname: '/api/v1/revenue/prices/apply', search: '?tenantId=mountain-tours&dry=0' },
    } as NextRequest;
    expect(revenueBodyHash('{"a":1}')).toMatch(/^[a-f0-9]{64}$/);
    expect(revenueCanonicalRequest(request, '1000', 'nonce', '{"a":1}')).toBe(
      `1000\nnonce\nPOST\n/api/v1/revenue/prices/apply?tenantId=mountain-tours&dry=0\n${revenueBodyHash('{"a":1}')}`,
    );
  });

  it('accepts a valid signature only for an explicitly bound tenant and scope', () => {
    const { request, body } = signedRequest({ scope: 'read|write' });
    expect(validateRevenuePilotSignature(request, body, 'write')).toEqual({
      ok: true,
      keyId: 'primary',
      tenantId: 'mountain-tours',
    });
  });

  it('rejects an unbound, missing, or duplicated tenant before any data access', () => {
    const unbound = signedRequest({ tenantId: 'other-brand' });
    expect(validateRevenuePilotSignature(unbound.request, unbound.body)).toMatchObject({
      ok: false,
      status: 403,
      code: 'MACHINE_TENANT_FORBIDDEN',
    });

    const missing = signedRequest();
    missing.request.nextUrl.searchParams.delete('tenantId');
    expect(validateRevenuePilotSignature(missing.request, missing.body)).toMatchObject({
      ok: false,
      status: 403,
      code: 'MACHINE_TENANT_FORBIDDEN',
    });

    const duplicated = signedRequest();
    duplicated.request.nextUrl.searchParams.append('tenantId', 'default');
    expect(validateRevenuePilotSignature(duplicated.request, duplicated.body)).toMatchObject({
      ok: false,
      status: 403,
      code: 'MACHINE_TENANT_FORBIDDEN',
    });
  });

  it('rejects invalid signatures, missing scopes, and stale timestamps', () => {
    const invalid = signedRequest({ signatureOverride: '0'.repeat(64) });
    expect(validateRevenuePilotSignature(invalid.request, invalid.body)).toMatchObject({ ok: false, status: 401 });

    const nonHex = signedRequest({ signatureOverride: 'é'.repeat(64) });
    expect(() => validateRevenuePilotSignature(nonHex.request, nonHex.body)).not.toThrow();
    expect(validateRevenuePilotSignature(nonHex.request, nonHex.body)).toMatchObject({ ok: false, status: 401 });

    const scoped = signedRequest({ scope: 'read' });
    expect(validateRevenuePilotSignature(scoped.request, scoped.body, 'write')).toMatchObject({ ok: false, status: 403 });

    const stale = signedRequest({ timestamp: String(Date.now() - (5 * 60 * 1000) - 1) });
    expect(validateRevenuePilotSignature(stale.request, stale.body)).toMatchObject({ ok: false, status: 401 });
  });

  it('claims each nonce once and propagates non-duplicate database failures', async () => {
    jest.mocked(RevenueMachineNonce.create).mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000 }));
    await expect(claimRevenueNonce('primary', 'reused')).resolves.toBe(false);

    jest.mocked(RevenueMachineNonce.create).mockRejectedValueOnce(new Error('database unavailable'));
    await expect(claimRevenueNonce('primary', 'fresh')).rejects.toThrow('database unavailable');
  });
});
