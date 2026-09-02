export {};

// GET /api/admin/pages runs as an aggregation (see lib/admin/pagesListSort):
// the tenant scope must be the FIRST $match of every pipeline, the cursor
// must be applied only after the computed sort value exists, and no request
// parameter may widen the scope past the caller's brands.

const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn();
const mockPageAggregate = jest.fn();
const mockCategoryAggregate = jest.fn();
const mockPageCount = jest.fn();
const mockCategoryCount = jest.fn();

jest.mock('mongoose', () => {
  class MockObjectId {
    constructor(public value: string) {}
    static isValid(value: unknown) { return /^[a-f\d]{24}$/i.test(String(value)); }
    getTimestamp() { return new Date(0); }
    toString() { return this.value; }
  }
  return { Types: { ObjectId: MockObjectId } };
});

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status || 200;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
    async json() { return this.data; }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
  canAccessTenant: (...args: unknown[]) => mockCanAccessTenant(...args),
  adminCanAccessTenant: (...args: unknown[]) => mockCanAccessTenant(...args),
  tenantForbiddenResponse: () => {
    const { NextResponse } = jest.requireMock('next/server');
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  },
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: { aggregate: mockPageAggregate, countDocuments: mockPageCount },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: { aggregate: mockCategoryAggregate, countDocuments: mockCategoryCount },
}));

type Stage = Record<string, unknown>;

function firstMatch(mock: jest.Mock): unknown {
  const pipeline = mock.mock.calls[0][0] as Stage[];
  return pipeline[0].$match;
}

function stageKeys(mock: jest.Mock): string[] {
  return (mock.mock.calls[0][0] as Stage[]).map((stage) => Object.keys(stage)[0]);
}

async function get(url: string) {
  const { GET } = await import('@/app/api/admin/pages/route');
  return GET({ nextUrl: new URL(url) } as never);
}

describe('GET /api/admin/pages tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanAccessTenant.mockReturnValue(true);
    mockPageAggregate.mockResolvedValue([]);
    mockCategoryAggregate.mockResolvedValue([]);
    mockPageCount.mockResolvedValue(0);
    mockCategoryCount.mockResolvedValue(0);
  });

  it('limits All Brands to a non-super-admin assigned brands', async () => {
    mockRequireAdminAuth.mockResolvedValue({
      role: 'admin',
      tenantIds: ['makadi-bay', 'el-gouna'],
    });
    const response = await get('https://dashboard.example/api/admin/pages');

    expect(response.status).toBe(200);
    // The tenant scope and the DB-side archived exclusion travel together in
    // the first $match — archived rows never reach the cursor-paginated merge.
    expect(firstMatch(mockPageAggregate)).toEqual({
      $and: [
        { tenantId: { $in: ['makadi-bay', 'el-gouna'] } },
        { archivedAt: null },
      ],
    });
    expect(firstMatch(mockCategoryAggregate)).toEqual({
      $and: [
        { tenantId: { $in: ['makadi-bay', 'el-gouna'] } },
        { archivedAt: null },
      ],
    });
  });

  it('never lets a user scoped to brand A read brand B, even by asking for it', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'admin', tenantIds: ['brand-a'] });
    mockCanAccessTenant.mockImplementation((_auth: unknown, tenantId: string) => tenantId === 'brand-a');

    const response = await get('https://dashboard.example/api/admin/pages?tenantId=brand-b');

    expect(response.status).toBe(403);
    expect(mockPageAggregate).not.toHaveBeenCalled();
    expect(mockCategoryAggregate).not.toHaveBeenCalled();
    expect(mockPageCount).not.toHaveBeenCalled();
  });

  it('keeps the scope as the first clause when search, editor and sort are all set', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'admin', tenantIds: ['brand-a'] });
    await get('https://dashboard.example/api/admin/pages?q=pyramids&editor=Sara&sort=updated&kind=attraction');

    const match = firstMatch(mockPageAggregate) as { $and: Stage[] };
    expect(match.$and[0]).toEqual({ tenantId: { $in: ['brand-a'] } });
    expect(match.$and[1]).toEqual({ pageType: 'attraction', archivedAt: null });
    expect(match.$and[2]).toEqual({ $or: [{ title: expect.any(RegExp) }, { slug: expect.any(RegExp) }] });
    expect(match.$and[3]).toEqual(expect.objectContaining({
      $or: expect.arrayContaining([{ 'createdBy.name': expect.any(RegExp) }, { 'updatedBy.email': expect.any(RegExp) }]),
    }));
    // kind=attraction never queries categories at all
    expect(mockCategoryAggregate).not.toHaveBeenCalled();
  });

  it('uses the selected brand as the exact tenant scope', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'super_admin', tenantIds: [] });
    await get('https://dashboard.example/api/admin/pages?tenantId=makadi-bay');

    expect(mockCanAccessTenant).toHaveBeenCalledWith(expect.anything(), 'makadi-bay');
    expect(firstMatch(mockPageAggregate)).toEqual({
      $and: [{ tenantId: 'makadi-bay' }, { archivedAt: null }],
    });
    expect(firstMatch(mockCategoryAggregate)).toEqual({
      $and: [{ tenantId: 'makadi-bay' }, { archivedAt: null }],
    });
  });

  it('filters author and editor fields inside the selected tenant scope', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'super_admin', tenantIds: [] });
    await get('https://dashboard.example/api/admin/pages?tenantId=makadi-bay&editor=Sara');

    const editorClause = expect.objectContaining({
      $or: expect.arrayContaining([
        { 'createdBy.name': expect.any(RegExp) },
        { 'updatedBy.email': expect.any(RegExp) },
      ]),
    });
    expect(firstMatch(mockPageAggregate)).toEqual({
      $and: [{ tenantId: 'makadi-bay' }, { archivedAt: null }, editorClause],
    });
    expect(firstMatch(mockCategoryAggregate)).toEqual({
      $and: [{ tenantId: 'makadi-bay' }, { archivedAt: null }, editorClause],
    });
  });

  it('scopes the per-kind counts to the same brands', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'admin', tenantIds: ['brand-a'] });
    await get('https://dashboard.example/api/admin/pages');

    expect(mockPageCount).toHaveBeenCalledWith({ tenantId: { $in: ['brand-a'] }, pageType: 'attraction', archivedAt: null });
    expect(mockPageCount).toHaveBeenCalledWith({ tenantId: { $in: ['brand-a'] }, pageType: 'category', archivedAt: null });
    expect(mockCategoryCount).toHaveBeenCalledWith({ tenantId: { $in: ['brand-a'] }, archivedAt: null });
  });
});

describe('GET /api/admin/pages sort + cursor pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanAccessTenant.mockReturnValue(true);
    mockRequireAdminAuth.mockResolvedValue({ role: 'admin', tenantIds: ['brand-a'] });
    mockPageAggregate.mockResolvedValue([]);
    mockCategoryAggregate.mockResolvedValue([]);
    mockPageCount.mockResolvedValue(0);
    mockCategoryCount.mockResolvedValue(0);
  });

  it('sorts newest-created by default on the computed value with an _id tiebreak', async () => {
    await get('https://dashboard.example/api/admin/pages');
    const pipeline = mockPageAggregate.mock.calls[0][0] as Stage[];
    expect(stageKeys(mockPageAggregate)).toEqual(['$match', '$addFields', '$sort', '$limit', '$project']);
    expect(pipeline[1]).toEqual({ $addFields: { __sortValue: { $ifNull: ['$createdAt', { $toDate: '$_id' }] } } });
    expect(pipeline[2]).toEqual({ $sort: { __sortValue: -1, _id: -1 } });
    expect(pipeline[3]).toEqual({ $limit: 21 });
  });

  it('sorts by last modified when asked, falling back to createdAt then the ObjectId', async () => {
    await get('https://dashboard.example/api/admin/pages?sort=updated');
    for (const mock of [mockPageAggregate, mockCategoryAggregate]) {
      const pipeline = mock.mock.calls[0][0] as Stage[];
      expect(pipeline[1]).toEqual({
        $addFields: { __sortValue: { $ifNull: ['$updatedAt', { $ifNull: ['$createdAt', { $toDate: '$_id' }] }] } },
      });
      expect(pipeline[2]).toEqual({ $sort: { __sortValue: -1, _id: -1 } });
    }
  });

  it('applies the cursor AFTER the sort value exists, against that value', async () => {
    const cursor = Buffer.from(JSON.stringify({ c: '2026-07-20T10:00:00.000Z', id: '66a000000000000000000001' })).toString('base64url');
    await get(`https://dashboard.example/api/admin/pages?sort=updated&cursor=${cursor}`);

    expect(stageKeys(mockPageAggregate)).toEqual(['$match', '$addFields', '$match', '$sort', '$limit', '$project']);
    const pipeline = mockPageAggregate.mock.calls[0][0] as Stage[];
    const cursorMatch = pipeline[2].$match as { $or: Stage[] };
    expect(cursorMatch.$or[0]).toEqual({ __sortValue: { $lt: new Date('2026-07-20T10:00:00.000Z') } });
    expect(cursorMatch.$or[1]).toMatchObject({ __sortValue: new Date('2026-07-20T10:00:00.000Z') });
    expect(cursorMatch.$or[1]).toHaveProperty('_id');
    // the tenant scope is untouched by paging
    expect(pipeline[0]).toEqual({ $match: { $and: [{ tenantId: { $in: ['brand-a'] } }, { archivedAt: null }] } });
  });

  it('rejects a malformed cursor instead of silently restarting from page one', async () => {
    const response = await get('https://dashboard.example/api/admin/pages?cursor=not-a-cursor');
    expect(response.status).toBe(400);
    expect(mockPageAggregate).not.toHaveBeenCalled();
  });

  it('merges both models on the computed value and emits a cursor from the last row', async () => {
    const page = (id: string, sortValue: string, extra: Stage = {}) => ({
      _id: id, tenantId: 'brand-a', title: `Page ${id.slice(-1)}`, slug: `page-${id.slice(-1)}`,
      pageType: 'attraction', createdAt: new Date('2026-01-01T00:00:00Z'), __sortValue: new Date(sortValue), ...extra,
    });
    mockPageAggregate.mockResolvedValue([
      page('66a000000000000000000001', '2026-07-03T00:00:00Z'),
      page('66a000000000000000000002', '2026-07-01T00:00:00Z'),
    ]);
    mockCategoryAggregate.mockResolvedValue([
      { _id: '66a000000000000000000009', tenantId: 'brand-a', name: 'Cat', slug: 'cat', __sortValue: new Date('2026-07-02T00:00:00Z') },
    ]);

    const response = await get('https://dashboard.example/api/admin/pages?sort=updated&limit=2');
    const body = await response.json() as { data: Array<{ id: string; kind: string }>; nextCursor: string | null };

    expect(body.data.map((row) => row.id)).toEqual(['66a000000000000000000001', '66a000000000000000000009']);
    expect(body.data[1].kind).toBe('category');
    const decoded = JSON.parse(Buffer.from(body.nextCursor as string, 'base64url').toString('utf8'));
    expect(decoded).toEqual({ c: '2026-07-02T00:00:00.000Z', id: '66a000000000000000000009' });
  });
});
