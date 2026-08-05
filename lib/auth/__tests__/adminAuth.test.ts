jest.mock('@/lib/jwt', () => ({ verifyToken: jest.fn() }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
const mockRegisterAdminAuditActor = jest.fn();
jest.mock('@/lib/admin/adminAudit', () => ({
  registerAdminAuditActor: mockRegisterAdminAuditActor,
}));
let mockAdminRecord = {
  _id: 'admin-id',
  email: 'admin@example.com',
  role: 'admin',
  permissions: ['manageDashboard'],
  tenantIds: ['hurghada-speedboat'],
  isActive: true,
  twoFactorEnabled: true,
};
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(() => ({
      select: jest.fn(() => ({
        lean: jest.fn().mockImplementation(() => Promise.resolve(mockAdminRecord)),
      })),
    })),
  },
}));

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    constructor(_body?: unknown, init?: { status?: number }) {
      this.status = init?.status || 200;
    }
    static json(_data: unknown, init?: { status?: number }) {
      return new MockNextResponse(null, init);
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: jest.fn() };
});

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { requireAdminAuth } from '../adminAuth';

const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('requireAdminAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminRecord = {
      ...mockAdminRecord,
      twoFactorEnabled: true,
    };
  });

  it('does not accept browser-visible bearer credentials', async () => {
    const request = {
      headers: new Headers({ authorization: 'Bearer exposed-token' }),
      cookies: { get: jest.fn().mockReturnValue(undefined) },
      nextUrl: new URL('https://dashboard.egypt-excursionsonline.com/api/admin/dashboard'),
    } as any;

    const result = await requireAdminAuth(request);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
    expect(mockedVerifyToken).not.toHaveBeenCalled();
  });

  it('accepts a valid admin session only from the HTTP-only cookie', async () => {
    mockedVerifyToken.mockResolvedValue({
      sub: 'admin-id',
      scope: 'admin',
      role: 'admin',
      permissions: ['manageDashboard'],
      tenantIds: ['hurghada-speedboat'],
    } as any);
    const request = {
      headers: new Headers(),
      cookies: { get: jest.fn().mockReturnValue({ value: 'cookie-token' }) },
      nextUrl: new URL('https://dashboard.egypt-excursionsonline.com/api/admin/dashboard'),
    } as any;

    const result = await requireAdminAuth(request);
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(mockedVerifyToken).toHaveBeenCalledWith('cookie-token');
    expect(result).toMatchObject({ userId: 'admin-id', tenantIds: ['hurghada-speedboat'] });
  });

  it('allows the explicit development-only synthetic admin without a database identity', async () => {
    const previous = process.env.ALLOW_ENV_ADMIN;
    process.env.ALLOW_ENV_ADMIN = 'true';
    mockedVerifyToken.mockResolvedValue({
      sub: 'env-admin',
      scope: 'admin',
      email: 'admin@example.com',
      permissions: ['manageDashboard'],
      tenantIds: [],
    } as any);
    const request = {
      headers: new Headers(),
      cookies: { get: jest.fn().mockReturnValue({ value: 'cookie-token' }) },
      nextUrl: new URL('https://dashboard.egypt-excursionsonline.com/api/admin/dashboard'),
    } as any;

    try {
      const result = await requireAdminAuth(request);
      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toMatchObject({
        userId: 'env-admin',
        role: 'super_admin',
        twoFactorEnabled: true,
      });
      expect((result as any).tenantIds).toContain('hurghada-excursions-online');
    } finally {
      if (previous === undefined) delete process.env.ALLOW_ENV_ADMIN;
      else process.env.ALLOW_ENV_ADMIN = previous;
    }
  });

  it('blocks normal admin APIs until two-factor enrollment is complete', async () => {
    mockAdminRecord = { ...mockAdminRecord, twoFactorEnabled: false };
    mockedVerifyToken.mockResolvedValue({ sub: 'admin-id', scope: 'admin' } as any);
    const request = {
      headers: new Headers(),
      cookies: { get: jest.fn().mockReturnValue({ value: 'cookie-token' }) },
      nextUrl: new URL('https://dashboard.egypt-excursionsonline.com/api/admin/dashboard'),
    } as any;

    const result = await requireAdminAuth(request);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('allows only the enrollment endpoints to authenticate an unenrolled admin', async () => {
    mockAdminRecord = { ...mockAdminRecord, twoFactorEnabled: false };
    mockedVerifyToken.mockResolvedValue({ sub: 'admin-id', scope: 'admin' } as any);
    const request = {
      headers: new Headers(),
      cookies: { get: jest.fn().mockReturnValue({ value: 'cookie-token' }) },
      nextUrl: new URL('https://dashboard.egypt-excursionsonline.com/api/admin/2fa'),
    } as any;

    const result = await requireAdminAuth(request, { allowTwoFactorEnrollment: true });
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toMatchObject({
      userId: 'admin-id',
      permissions: [],
      tenantIds: [],
      twoFactorEnabled: false,
    });
    expect(mockRegisterAdminAuditActor).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'admin-id',
      permissions: [],
      tenantIds: ['hurghada-speedboat'],
    }));
  });
});
