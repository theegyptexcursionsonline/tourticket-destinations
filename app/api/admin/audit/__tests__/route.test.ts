jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _body: unknown;
    headers: Record<string, string>;
    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this._body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers || {};
    }
    async json() { return this._body; }
    static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextResponse: MockNextResponse };
});

Object.defineProperty(global, 'ReadableStream', {
  configurable: true,
  value: require('node:stream/web').ReadableStream,
});

const mockRequireAdminAuth = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockDistinct = jest.fn();
const mockRecordAdminMutation = jest.fn();
const mockLean = jest.fn();
const mockLimit = jest.fn(() => ({ lean: mockLean }));
const mockCursorClose = jest.fn();
const mockAuditCursor = {
  async *[Symbol.asyncIterator]() {
    yield {
      _id: '64c2f4bc2f4bc2f4bc2f4bc2',
      actorUserId: 'admin-1',
      actorEmail: 'supervisor@example.com',
      actorRole: 'operations',
      action: 'update',
      outcome: 'succeeded',
      statusCode: 200,
      resourceType: 'tours',
      resourceLabel: 'Desert Safari',
      changedFields: ['status'],
      changes: [{ field: 'status', after: 'published' }],
      summary: 'Updated Tours',
      method: 'PATCH',
      path: '/api/admin/tours/64c2f4bc2f4bc2f4bc2f4bc2',
      tenantIds: ['brand-a'],
      createdAt: new Date('2026-08-04T10:00:00.000Z'),
    };
  },
  close: mockCursorClose,
};
const mockSort = jest.fn(() => ({
  limit: mockLimit,
  lean: () => ({ cursor: () => mockAuditCursor }),
}));

jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
}));
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/admin/adminAudit', () => ({
  ...jest.requireActual('@/lib/admin/adminAudit'),
  recordAdminMutation: (...args: unknown[]) => mockRecordAdminMutation(...args),
}));
jest.mock('@/lib/models/AdminMutationAudit', () => ({
  __esModule: true,
  default: {
    find: (...args: unknown[]) => mockFind(...args),
    countDocuments: (...args: unknown[]) => mockCountDocuments(...args),
    distinct: (...args: unknown[]) => mockDistinct(...args),
  },
}));

const { NextResponse } = jest.requireMock('next/server');
import { GET } from '../route';

function makeRequest(query = '') {
  const url = new URL(`https://dashboard.example.com/api/admin/audit${query}`);
  return {
    method: 'GET',
    nextUrl: { pathname: url.pathname, searchParams: url.searchParams },
    headers: { get: () => null },
  } as never;
}

describe('GET /api/admin/audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({
      userId: 'admin-1',
      role: 'operations',
      permissions: ['manageAudit'],
      tenantIds: ['brand-a', 'brand-b'],
    });
    mockFind.mockReturnValue({ sort: mockSort });
    mockLean.mockResolvedValue([
      {
        _id: '64c2f4bc2f4bc2f4bc2f4bc2',
        actorUserId: 'admin-1',
        actorEmail: 'supervisor@example.com',
        actorRole: 'operations',
        action: 'update',
        resourceType: 'tours',
        summary: 'Updated Tours',
        method: 'PATCH',
        tenantIds: ['brand-a'],
        createdAt: new Date('2026-08-04T10:00:00.000Z'),
      },
    ]);
    mockCountDocuments.mockResolvedValue(1);
    mockDistinct.mockImplementation((field: string) => {
      if (field === 'actorUserId') return Promise.resolve(['admin-1']);
      if (field === 'resourceType') return Promise.resolve(['tours']);
      if (field === 'outcome') return Promise.resolve(['succeeded']);
      return Promise.resolve(['update']);
    });
  });

  it('requires the grantable audit permission', async () => {
    const denied = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mockRequireAdminAuth.mockResolvedValue(denied);
    const response = await GET(makeRequest());
    expect(response.status).toBe(403);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockRequireAdminAuth).toHaveBeenCalledWith(expect.anything(), { permissions: ['manageAudit'] });
  });

  it('keeps a selected-brand query tenant-scoped and returns scoped stats', async () => {
    const response = await GET(makeRequest('?tenantId=brand-a&action=update&limit=25'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockFind).toHaveBeenCalledWith({
      $and: [{ action: 'update' }, { tenantIds: 'brand-a' }],
    });
    expect(payload.stats).toEqual({
      total: 1,
      today: 1,
      administrators: 1,
      succeeded: 1,
      rejected: 1,
      failed: 1,
    });
    expect(payload.data[0].actor.email).toBe('supervisor@example.com');
  });

  it('rejects a selected brand outside the administrator tenant scope', async () => {
    const response = await GET(makeRequest('?tenantId=brand-c'));
    expect(response.status).toBe(403);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('limits all-brand activity to the administrator tenant set', async () => {
    await GET(makeRequest('?tenantId=all'));
    expect(mockFind).toHaveBeenCalledWith({
      $and: [{}, { tenantIds: { $in: ['brand-a', 'brand-b'] } }],
    });
  });

  it('bounds page size and fetches one extra row to determine tail reachability', async () => {
    await GET(makeRequest('?limit=9999'));
    expect(mockLimit).toHaveBeenCalledWith(101);
  });

  it('rejects a malformed cursor instead of restarting at the first page', async () => {
    const response = await GET(makeRequest('?cursor=broken'));
    expect(response.status).toBe(400);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('refuses a CSV export larger than the cap instead of streaming a truncated file', async () => {
    mockCountDocuments.mockReset();
    mockCountDocuments.mockResolvedValueOnce(999999);
    const response = await GET(makeRequest('?format=csv'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/narrow/i);
    expect(mockRecordAdminMutation).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({
      action: 'export',
      outcome: 'rejected',
      failureCode: 'EXPORT_LIMIT_EXCEEDED',
    }));
    // Never opened a cursor over an oversized result set.
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('logs a successful export and includes the detailed evidence columns', async () => {
    mockCountDocuments.mockReset();
    mockCountDocuments.mockResolvedValueOnce(1);
    const response = await GET(makeRequest('?tenantId=brand-a&format=csv')) as unknown as { status: number; _body: ReadableStream<Uint8Array> };
    const reader = response._body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
    }
    const csv = new TextDecoder().decode(Buffer.concat(chunks));

    expect(response.status).toBe(200);
    expect(csv).toContain('Outcome,HTTP Status');
    expect(csv).toContain('Changed Fields,Safe Recorded Values');
    expect(csv).toContain('Request ID,IP Address,Device,Failure Code');
    expect(mockRecordAdminMutation).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({
      action: 'export',
      outcome: 'succeeded',
      tenantIds: ['brand-a'],
    }));
  });

  it('records a stream failure as failed instead of claiming the export succeeded', async () => {
    const failingCursor = {
      async *[Symbol.asyncIterator]() {
        throw new Error('cursor disconnected');
      },
      close: jest.fn(),
    };
    mockCountDocuments.mockReset();
    mockCountDocuments.mockResolvedValueOnce(1);
    mockSort.mockImplementationOnce(() => ({
      limit: mockLimit,
      lean: () => ({ cursor: () => failingCursor }),
    }));

    const response = await GET(makeRequest('?format=csv')) as unknown as { _body: ReadableStream<Uint8Array> };
    const reader = response._body.getReader();
    await reader.read(); // CSV header is emitted before the database cursor is consumed.
    await expect(reader.read()).rejects.toThrow('cursor disconnected');
    expect(mockRecordAdminMutation).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({
      action: 'export',
      outcome: 'failed',
      failureCode: 'EXPORT_STREAM_FAILED',
    }));
  });
});
