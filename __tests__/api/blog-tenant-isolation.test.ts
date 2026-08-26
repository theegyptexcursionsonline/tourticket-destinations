import fs from 'node:fs';
import path from 'node:path';

const mockDbConnect = jest.fn();
const mockGetTenantFromRequest = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockUpdateOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();

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

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: (...args: unknown[]) => mockDbConnect(...args) }));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: (...args: unknown[]) => mockGetTenantFromRequest(...args),
  buildStrictTenantQuery: (base: Record<string, unknown>, tenantId: string) => ({
    ...base,
    $or: [{ tenantId }, { tenantIds: tenantId }],
  }),
}));
jest.mock('@/lib/models/Blog', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    find: (...args: unknown[]) => mockFind(...args),
    countDocuments: (...args: unknown[]) => mockCountDocuments(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

function chain<T>(value: T) {
  const query = {
    populate: jest.fn(),
    limit: jest.fn(),
    sort: jest.fn(),
    select: jest.fn(),
    lean: jest.fn().mockResolvedValue(value),
  };
  query.populate.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return query;
}

describe('public blog tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockGetTenantFromRequest.mockResolvedValue('cairo-excursions-online');
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockCountDocuments.mockResolvedValue(0);
  });

  it('scopes detail reads, populated joins, view updates, and related posts to one tenant', async () => {
    const detail = chain({
      _id: 'blog-1',
      slug: 'shared-slug',
      category: 'destination-guides',
      title: 'English title',
      excerpt: 'English excerpt',
      content: 'English content',
      faqs: [{ question: 'English?', answer: 'English answer' }],
      translations: {
        ar: {
          title: 'عنوان عربي',
          excerpt: 'ملخص عربي',
          content: 'محتوى عربي',
          faqs: [{ question: 'سؤال؟', answer: 'إجابة' }],
        },
      },
    });
    const related = chain([]);
    mockFindOne.mockReturnValue(detail);
    mockFind.mockReturnValue(related);

    const { getLocalizedBlogPost } = await import('@/lib/content/blogReader');
    const result = await getLocalizedBlogPost('shared-slug', 'cairo-excursions-online', 'ar');
    const strict = { $or: [
      { tenantId: 'cairo-excursions-online' },
      { tenantIds: 'cairo-excursions-online' },
    ] };
    expect(mockDbConnect).toHaveBeenCalledWith('cairo-excursions-online');
    expect(mockFindOne).toHaveBeenCalledWith({ slug: 'shared-slug', status: 'published', ...strict });
    expect(detail.populate).toHaveBeenNthCalledWith(1, {
      path: 'relatedDestinations',
      select: 'name slug image translations',
      match: strict,
    });
    expect(detail.populate).toHaveBeenNthCalledWith(2, {
      path: 'relatedTours',
      select: 'title slug image discountPrice translations',
      match: strict,
    });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: 'blog-1', ...strict },
      { $inc: { views: 1 } },
    );
    expect(mockFind).toHaveBeenCalledWith({
      status: 'published',
      category: 'destination-guides',
      _id: { $ne: 'blog-1' },
      ...strict,
    });
    expect(result.blog).toMatchObject({
      title: 'عنوان عربي',
      excerpt: 'ملخص عربي',
      content: 'محتوى عربي',
      faqs: [{ question: 'سؤال؟', answer: 'إجابة' }],
    });
  });

  it('scopes author article collections without default-tenant fallback', async () => {
    const posts = chain([]);
    mockFind.mockReturnValue(posts);
    const { getTenantAuthorBlogRecords } = await import('@/lib/content/blogReader');
    await getTenantAuthorBlogRecords('cairo-excursions-online');
    expect(mockDbConnect).toHaveBeenCalledWith('cairo-excursions-online');
    expect(mockFind).toHaveBeenCalledWith({
      $and: [{
        tenantId: 'cairo-excursions-online',
        status: 'published',
      }],
    });
    expect(posts.limit).toHaveBeenCalledWith(25);
  });

  it('localizes author article collections inside the same tenant boundary', async () => {
    const posts = chain([{
      title: 'English title',
      excerpt: 'English excerpt',
      translations: { ar: { title: 'عنوان عربي', excerpt: 'ملخص عربي' } },
    }]);
    mockFind.mockReturnValue(posts);
    const { getTenantAuthorBlogRecords } = await import('@/lib/content/blogReader');
    const records = await getTenantAuthorBlogRecords('cairo-excursions-online', 'ar');
    expect(records[0]).toMatchObject({ title: 'عنوان عربي', excerpt: 'ملخص عربي' });
    expect(posts.select).toHaveBeenCalledWith(expect.stringContaining('translations.ar.title'));
  });

  it('passes the resolved tenant into every direct blog-page database connection', () => {
    const listingPage = fs.readFileSync(
      path.join(process.cwd(), 'app/[locale]/blog/page.tsx'),
      'utf8',
    );
    const detailPage = fs.readFileSync(
      path.join(process.cwd(), 'app/[locale]/blog/[slug]/page.tsx'),
      'utf8',
    );
    expect(listingPage).toContain('await dbConnect(tenantId)');
    expect(detailPage).toContain('await dbConnect(tenantId)');
    expect(listingPage).not.toContain('await dbConnect()');
    expect(detailPage).not.toContain('await dbConnect()');
  });

  it('increments likes atomically with a strict tenant-and-slug selector', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ _id: 'blog-1' });
    const { POST } = await import('@/app/api/blog/[slug]/like/route');
    const request = {
      headers: new Headers({ 'x-forwarded-for': '198.51.100.8' }),
    } as never;
    const response = await POST(request, { params: Promise.resolve({ slug: 'shared-slug' }) });
    expect(response.status).toBe(200);
    expect(mockDbConnect).toHaveBeenCalledWith('cairo-excursions-online');
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        slug: 'shared-slug',
        status: 'published',
        $or: [
          { tenantId: 'cairo-excursions-online' },
          { tenantIds: 'cairo-excursions-online' },
        ],
      },
      { $inc: { likes: 1 } },
      { new: true },
    );
  });

  it('derives list tenancy from the request context, not a caller-supplied tenant query', async () => {
    const posts = chain([]);
    mockFind.mockReturnValue(posts);
    const { GET } = await import('@/app/api/blog/route');
    const url = new URL('https://cairo.example/api/blog?tenantId=hurghada-excursions-online');
    const response = await GET({
      url: url.toString(),
      nextUrl: url,
      headers: new Headers(),
    } as never);
    expect(response.status).toBe(200);
    expect(mockFind).toHaveBeenCalledWith({
      $and: [{
        tenantId: 'cairo-excursions-online',
        status: 'published',
      }],
    });
  });
});
