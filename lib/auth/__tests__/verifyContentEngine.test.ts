const mockRegisterAdminAuditActor = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status ?? 200;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
    async json() { return this.data; }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/admin/adminAudit', () => ({
  registerAdminAuditActor: (...args: unknown[]) => mockRegisterAdminAuditActor(...args),
}));

import { verifyContentEngine } from '@/lib/auth/verifyContentEngine';

function request(authorization?: string) {
  const headers = new Headers(authorization ? { authorization } : undefined);
  return { headers } as never;
}

describe('verifyContentEngine', () => {
  const originalKey = process.env.CONTENT_ENGINE_API_KEY;

  beforeEach(() => {
    process.env.CONTENT_ENGINE_API_KEY = 'aa';
    mockRegisterAdminAuditActor.mockClear();
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.CONTENT_ENGINE_API_KEY;
    else process.env.CONTENT_ENGINE_API_KEY = originalKey;
  });

  it('returns clean 401 responses for missing, wrong, and multibyte tokens', async () => {
    expect(verifyContentEngine(request())?.status).toBe(401);
    expect(verifyContentEngine(request('Bearer bb'))?.status).toBe(401);
    expect(() => verifyContentEngine(request('Bearer éé'))).not.toThrow();
    expect(verifyContentEngine(request('Bearer éé'))?.status).toBe(401);
    expect(mockRegisterAdminAuditActor).not.toHaveBeenCalled();
  });

  it('accepts the exact token and can defer audit actor registration', () => {
    expect(verifyContentEngine(request('Bearer aa'))).toBeNull();
    expect(mockRegisterAdminAuditActor).toHaveBeenCalledTimes(1);

    mockRegisterAdminAuditActor.mockClear();
    expect(verifyContentEngine(request('Bearer aa'), { registerAuditActor: false })).toBeNull();
    expect(mockRegisterAdminAuditActor).not.toHaveBeenCalled();
  });

  it('fails closed when the receiver key is not configured', () => {
    delete process.env.CONTENT_ENGINE_API_KEY;
    expect(verifyContentEngine(request('Bearer aa'))?.status).toBe(503);
  });
});
