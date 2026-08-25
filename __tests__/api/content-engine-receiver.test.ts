const mockDbConnect = jest.fn();
const mockRegisterAdminAuditActor = jest.fn();
const mockAuditCreate = jest.fn();
const mockRevalidate = jest.fn();
const mockBeginContentPublish = jest.fn();
const mockCompleteContentPublish = jest.fn();
const mockReleaseContentPublishClaim = jest.fn();
const mockBlogFindOne = jest.fn();
const mockBlogCreate = jest.fn();
const mockDestinationFindOne = jest.fn();
const mockDestinationCreate = jest.fn();
const mockCategoryFindOne = jest.fn();
const mockCategoryCreate = jest.fn();
const mockTourFindOne = jest.fn();
const mockTourCreate = jest.fn();

jest.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    method: string;
    headers: Headers;
    nextUrl: URL;
    private bodyText?: string;
    constructor(url: string, init: { method?: string; headers?: Headers; body?: string } = {}) {
      this.url = url;
      this.method = init.method ?? 'GET';
      this.headers = init.headers ?? new Headers();
      this.nextUrl = new URL(url);
      this.bodyText = init.body;
    }
    clone() {
      return new MockNextRequest(this.url, {
        method: this.method,
        headers: new Headers(this.headers),
        body: this.bodyText,
      });
    }
    async json() {
      if (this.bodyText === undefined) throw new Error('No JSON body');
      return JSON.parse(this.bodyText);
    }
  }
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
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

import { NextRequest } from 'next/server';

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: (...args: unknown[]) => mockDbConnect(...args) }));
jest.mock('@/lib/admin/adminAudit', () => ({
  ...jest.requireActual('@/lib/admin/adminAudit'),
  registerAdminAuditActor: (...args: unknown[]) => mockRegisterAdminAuditActor(...args),
}));
jest.mock('@/lib/models/AdminMutationAudit', () => ({
  __esModule: true,
  default: { create: (...args: unknown[]) => mockAuditCreate(...args) },
}));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: (...args: unknown[]) => mockRevalidate(...args),
}));
jest.mock('@/lib/content-engine/publishIdempotency', () => {
  return {
    beginContentPublish: (...args: unknown[]) => mockBeginContentPublish(...args),
    completeContentPublish: (...args: unknown[]) => mockCompleteContentPublish(...args),
    releaseContentPublishClaim: (...args: unknown[]) => mockReleaseContentPublishClaim(...args),
    hashPublishRequest: (body: unknown) => JSON.stringify(body),
    readRequiredIdempotencyKey: (value: string | null | undefined) => {
      const key = value?.trim() ?? '';
      return key
        ? { ok: true, key }
        : { ok: false, error: 'Idempotency-Key header is required' };
    },
  };
});
jest.mock('@/lib/models/Blog', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockBlogFindOne(...args),
    create: (...args: unknown[]) => mockBlogCreate(...args),
  },
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockDestinationFindOne(...args),
    create: (...args: unknown[]) => mockDestinationCreate(...args),
  },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockCategoryFindOne(...args),
    create: (...args: unknown[]) => mockCategoryCreate(...args),
  },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockTourFindOne(...args),
    create: (...args: unknown[]) => mockTourCreate(...args),
  },
}));

const token = 'receiver-test-token';
const blogPayload = {
  title: 'A complete Cairo travel guide',
  slug: 'shared-travel-guide',
  excerpt: 'A practical guide to planning a visit.',
  content: 'A'.repeat(140),
  category: 'destination-guides',
  tags: ['cairo'],
};

function request(
  path: string,
  body?: unknown,
  options: { method?: string; token?: string | null; idempotencyKey?: string } = {},
) {
  const headers = new Headers();
  if (options.token !== null) headers.set('authorization', `Bearer ${options.token ?? token}`);
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (options.idempotencyKey) headers.set('idempotency-key', options.idempotencyKey);
  return new NextRequest(`https://receiver.example${path}`, {
    method: options.method ?? (body === undefined ? 'GET' : 'POST'),
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function claim(resourceId: string, resumed = false) {
  return {
    outcome: 'proceed',
    receiptId: `receipt-${resourceId}`,
    claimToken: `claim-${resourceId}`,
    resourceId,
    resumed,
  };
}

function queryResult<T>(value: T) {
  const chain = {
    select: jest.fn(),
    sort: jest.fn(),
    populate: jest.fn(),
    lean: jest.fn().mockResolvedValue(value),
  };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.populate.mockReturnValue(chain);
  return chain;
}

describe('Content Engine receiver routes', () => {
  const originalKey = process.env.CONTENT_ENGINE_API_KEY;

  beforeAll(() => {
    process.env.CONTENT_ENGINE_API_KEY = token;
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.CONTENT_ENGINE_API_KEY;
    else process.env.CONTENT_ENGINE_API_KEY = originalKey;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockCompleteContentPublish.mockResolvedValue(undefined);
    mockReleaseContentPublishClaim.mockResolvedValue(undefined);
  });

  it('authenticates first and rejects unknown/malformed tenants with zero DB or receipt writes', async () => {
    const { POST } = await import('@/app/api/admin/content/blog/route');

    const unauthenticated = await POST(request('/api/admin/content/blog', {
      tenantId: 'not-configured', payload: blogPayload,
    }, { token: null, idempotencyKey: 'key-1' }));
    expect(unauthenticated.status).toBe(401);

    for (const tenantId of [undefined, 'default', ' cairo-excursions-online', 'not-configured']) {
      const response = await POST(request('/api/admin/content/blog', {
        tenantId, payload: blogPayload,
      }, { idempotencyKey: 'key-1' }));
      expect(response.status).toBe(422);
    }
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(mockBeginContentPublish).not.toHaveBeenCalled();
    expect(mockBlogFindOne).not.toHaveBeenCalled();
    expect(mockBlogCreate).not.toHaveBeenCalled();
    expect(mockRegisterAdminAuditActor).not.toHaveBeenCalled();
    expect(mockAuditCreate).not.toHaveBeenCalled();
  });

  it('keeps the healthcheck sentinel DB-free and rejects a real unknown-tenant lookup before DB', async () => {
    const { GET } = await import('@/app/api/admin/content/blog/[slug]/route');
    const health = await GET(request('/api/admin/content/blog/__healthcheck__'), {
      params: Promise.resolve({ slug: '__healthcheck__' }),
    });
    expect(health.status).toBe(404);
    const wrongTenant = await GET(
      request('/api/admin/content/blog/slug?tenantId=default'),
      { params: Promise.resolve({ slug: 'slug' }) },
    );
    expect(wrongTenant.status).toBe(422);
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(mockBlogFindOne).not.toHaveBeenCalled();
  });

  it('allows the same blog slug in two tenants and returns unprefixed canonical URLs', async () => {
    const { POST } = await import('@/app/api/admin/content/blog/route');
    mockBlogFindOne.mockResolvedValue(null);
    mockBeginContentPublish.mockImplementation(({ tenantId }: { tenantId: string }) =>
      claim(tenantId === 'cairo-excursions-online'
        ? '111111111111111111111111'
        : '222222222222222222222222'));
    mockBlogCreate.mockImplementation(async (input: Record<string, unknown>) => ({
      _id: input._id,
      slug: input.slug,
    }));

    const cairo = await POST(request('/api/admin/content/blog', {
      tenantId: 'cairo-excursions-online',
      defaultLocale: 'en',
      payload: blogPayload,
    }, { idempotencyKey: 'cairo-key' }));
    const hurghada = await POST(request('/api/admin/content/blog', {
      tenantId: 'hurghada-excursions-online',
      defaultLocale: 'en',
      payload: blogPayload,
    }, { idempotencyKey: 'hurghada-key' }));

    expect(cairo.status).toBe(201);
    expect(hurghada.status).toBe(201);
    expect((await cairo.json()).liveUrl).toBe(
      'https://cairoexcursionsonline.com/blog/shared-travel-guide',
    );
    expect((await hurghada.json()).liveUrl).toBe(
      'https://hurghadaexcursionsonline.com/blog/shared-travel-guide',
    );
    expect(mockBlogFindOne).toHaveBeenNthCalledWith(1, {
      tenantId: 'cairo-excursions-online', slug: 'shared-travel-guide',
    });
    expect(mockBlogFindOne).toHaveBeenNthCalledWith(2, {
      tenantId: 'hurghada-excursions-online', slug: 'shared-travel-guide',
    });
    expect(mockBlogCreate.mock.calls.map(([input]) => (input as { tenantId: string }).tenantId)).toEqual([
      'cairo-excursions-online', 'hurghada-excursions-online',
    ]);
    expect(mockBlogCreate.mock.calls.map(([input]) => (input as { author: string }).author)).toEqual([
      'Editorial Team', 'Editorial Team',
    ]);
  });

  it('recovers a committed publish by matching the receipt-owned document id', async () => {
    const { POST } = await import('@/app/api/admin/content/blog/route');
    const resourceId = '333333333333333333333333';
    mockBeginContentPublish.mockResolvedValue(claim(resourceId, true));
    mockBlogFindOne.mockResolvedValue({ _id: resourceId, slug: blogPayload.slug });
    const response = await POST(request('/api/admin/content/blog', {
      tenantId: 'cairo-excursions-online', payload: blogPayload,
    }, { idempotencyKey: 'recovery-key' }));
    expect(response.status).toBe(201);
    expect(mockBlogCreate).not.toHaveBeenCalled();
    expect(mockCompleteContentPublish).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId, resumed: true }),
      201,
      expect.objectContaining({ id: resourceId }),
    );
  });

  it('adopts the deterministic document after a receipt TTL recycle', async () => {
    const { POST } = await import('@/app/api/admin/content/blog/route');
    const resourceId = '666666666666666666666666';
    mockBeginContentPublish.mockResolvedValue(claim(resourceId, false));
    mockBlogFindOne.mockResolvedValue({ _id: resourceId, slug: blogPayload.slug });
    const response = await POST(request('/api/admin/content/blog', {
      tenantId: 'cairo-excursions-online', payload: blogPayload,
    }, { idempotencyKey: 'recycled-receipt-key' }));
    expect(response.status).toBe(201);
    expect(mockBlogCreate).not.toHaveBeenCalled();
    expect(mockCompleteContentPublish).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId, resumed: false }),
      201,
      expect.objectContaining({ id: resourceId }),
    );
  });

  it('adopts a deterministic owned document when create committed but local acknowledgement failed', async () => {
    const { POST } = await import('@/app/api/admin/content/blog/route');
    const resourceId = '555555555555555555555555';
    mockBeginContentPublish.mockResolvedValue(claim(resourceId));
    mockBlogFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: resourceId, slug: blogPayload.slug });
    mockBlogCreate.mockRejectedValue(new Error('acknowledgement lost after commit'));
    const response = await POST(request('/api/admin/content/blog', {
      tenantId: 'cairo-excursions-online', payload: blogPayload,
    }, { idempotencyKey: 'response-loss-key' }));
    expect(response.status).toBe(201);
    expect(mockBlogFindOne).toHaveBeenNthCalledWith(2, {
      _id: resourceId,
      tenantId: 'cairo-excursions-online',
      slug: blogPayload.slug,
    });
    expect(mockCompleteContentPublish).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId }),
      201,
      expect.objectContaining({ id: resourceId }),
    );
    expect(mockReleaseContentPublishClaim).not.toHaveBeenCalled();
  });

  it('preserves the tenant-scoped legacy blog PUT interface', async () => {
    const { PUT } = await import('@/app/api/admin/content/blog/route');
    const existing = {
      _id: 'blog-1',
      slug: blogPayload.slug,
      tags: [],
      faqs: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockBlogFindOne.mockResolvedValue(existing);
    const response = await PUT(request('/api/admin/content/blog', {
      tenantId: 'cairo-excursions-online', payload: blogPayload,
    }, { method: 'PUT' }));
    expect(response.status).toBe(200);
    expect(mockBlogFindOne).toHaveBeenCalledWith({
      tenantId: 'cairo-excursions-online', slug: blogPayload.slug,
    });
    expect(existing.save).toHaveBeenCalledTimes(1);
    expect(mockBeginContentPublish).not.toHaveBeenCalled();
  });

  it('creates tours as tenant-scoped drafts with tenant-scoped required joins', async () => {
    const { POST } = await import('@/app/api/admin/content/tour/route');
    const resourceId = '444444444444444444444444';
    mockBeginContentPublish.mockResolvedValue(claim(resourceId));
    mockTourFindOne.mockResolvedValue(null);
    mockDestinationFindOne.mockReturnValue(queryResult({ _id: 'destination-1' }));
    mockCategoryFindOne.mockReturnValue(queryResult({ _id: 'category-1' }));
    mockTourCreate.mockImplementation(async (input: Record<string, unknown>) => ({
      _id: input._id,
      slug: input.slug,
    }));
    const tourPayload = {
      title: 'Cairo private highlights day tour',
      slug: 'cairo-private-highlights',
      location: 'Cairo, Egypt',
      duration: 'Full day (8 hours)',
      description: 'A complete private day tour through Cairo highlights.',
      longDescription: 'A'.repeat(220),
      featuredImage: 'https://images.example/tour.jpg',
      itinerary: [{ time: '08:00', title: 'Pickup', description: 'Meet the guide at the hotel lobby.' }],
      faq: [{ question: 'Is pickup included?', answer: 'Hotel pickup is included in central Cairo.' }],
    };
    const response = await POST(request('/api/admin/content/tour', {
      tenantId: 'cairo-excursions-online', payload: tourPayload,
    }, { idempotencyKey: 'tour-key' }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      status: 'draft',
      requiresManualPublish: true,
      liveUrl: 'https://cairoexcursionsonline.com/cairo-private-highlights',
    });
    expect(mockDestinationFindOne).toHaveBeenCalledWith({
      tenantId: 'cairo-excursions-online',
      name: { $regex: '^Cairo$', $options: 'i' },
    });
    expect(mockCategoryFindOne).toHaveBeenCalledWith({ tenantId: 'cairo-excursions-online' });
    expect(mockTourCreate).toHaveBeenCalledWith(expect.objectContaining({
      _id: resourceId,
      tenantId: 'cairo-excursions-online',
      tenantIds: ['cairo-excursions-online'],
      destination: 'destination-1',
      category: ['category-1'],
      image: 'https://images.example/tour.jpg',
      isPublished: false,
      isFeatured: false,
    }));
  });

  it('tenant-scopes populated tour joins and rejects cross-tenant join gaps', async () => {
    const { GET } = await import('@/app/api/admin/content/tour/[slug]/route');
    const chain = queryResult({
      _id: 'tour-1',
      slug: 'tour-one',
      title: 'Tour one',
      tenantId: 'cairo-excursions-online',
      destination: { _id: 'destination-1', slug: 'cairo' },
      category: [{ _id: 'category-1', slug: 'day-tours' }],
    });
    mockTourFindOne.mockReturnValue(chain);
    const response = await GET(
      request('/api/admin/content/tour/tour-one?tenantId=cairo-excursions-online'),
      { params: Promise.resolve({ slug: 'tour-one' }) },
    );
    expect(response.status).toBe(200);
    expect(mockTourFindOne).toHaveBeenCalledWith({
      tenantId: 'cairo-excursions-online', slug: 'tour-one',
    });
    expect(chain.populate).toHaveBeenNthCalledWith(1, {
      path: 'destination', select: '_id slug', match: { tenantId: 'cairo-excursions-online' },
    });
    expect(chain.populate).toHaveBeenNthCalledWith(2, {
      path: 'category', select: '_id slug', match: { tenantId: 'cairo-excursions-online' },
    });

    const broken = queryResult({
      _id: 'tour-1', slug: 'tour-one', title: 'Tour one',
      tenantId: 'cairo-excursions-online', destination: null, category: [],
    });
    mockTourFindOne.mockReturnValue(broken);
    const rejected = await GET(
      request('/api/admin/content/tour/tour-one?tenantId=cairo-excursions-online'),
      { params: Promise.resolve({ slug: 'tour-one' }) },
    );
    expect(rejected.status).toBe(409);
  });

  it('serves the canonical authenticated capability endpoint without DB access', async () => {
    const { GET } = await import('@/app/api/admin/content/capabilities/route');
    const response = await GET(request('/api/admin/content/capabilities'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      supportedTypes: ['blog', 'destination', 'category', 'tour'],
      manualReviewTypes: ['tour'],
    });
    expect(mockDbConnect).not.toHaveBeenCalled();
  });
});
