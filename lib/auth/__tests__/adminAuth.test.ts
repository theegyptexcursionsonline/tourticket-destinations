jest.mock('@/lib/jwt', () => ({ verifyToken: jest.fn() }));

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
  beforeEach(() => jest.clearAllMocks());

  it('does not accept browser-visible bearer credentials', async () => {
    const request = {
      headers: new Headers({ authorization: 'Bearer exposed-token' }),
      cookies: { get: jest.fn().mockReturnValue(undefined) },
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
      tenantIds: ['tenant-a'],
    } as any);
    const request = {
      headers: new Headers(),
      cookies: { get: jest.fn().mockReturnValue({ value: 'cookie-token' }) },
    } as any;

    const result = await requireAdminAuth(request);
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(mockedVerifyToken).toHaveBeenCalledWith('cookie-token');
    expect(result).toMatchObject({ userId: 'admin-id', tenantIds: ['tenant-a'] });
  });
});
