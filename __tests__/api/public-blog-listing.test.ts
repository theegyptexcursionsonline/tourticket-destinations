const mockDbConnect = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();

jest.mock('@/lib/dbConnect', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockDbConnect(...args),
}));

jest.mock('@/lib/models/Blog', () => ({
  __esModule: true,
  default: {
    find: (...args: unknown[]) => mockFind(...args),
    countDocuments: (...args: unknown[]) => mockCountDocuments(...args),
  },
}));

import {
  PUBLIC_BLOG_LIST_PROJECTION,
  PublicBlogListValidationError,
  buildPublicBlogListQuery,
  decodePublicBlogCursor,
  encodePublicBlogCursor,
  listPublicBlogPosts,
  parsePublicBlogListSearchParams,
} from '@/lib/content/publicBlogListing';

function objectId(index: number) {
  return index.toString(16).padStart(24, '0');
}

function row(index: number) {
  return {
    _id: objectId(index),
    tenantId: 'cairo-excursions-online',
    title: `Post ${index}`,
    slug: `post-${index}`,
    excerpt: `Excerpt ${index}`,
    content: `full article body ${index}`,
    featuredImage: 'https://images.example/post.jpg',
    category: 'destination-guides',
    author: 'EEO',
    createdAt: new Date(Date.UTC(2026, 7, index, 12, 0, 0)),
    publishedAt: new Date(Date.UTC(2026, 7, index, 12, 0, 0)),
    readTime: 4,
    views: index,
    likes: 0,
    tags: ['cairo'],
    featured: false,
    translations: {
      ar: {
        title: `عنوان ${index}`,
        excerpt: `ملخص ${index}`,
        content: `محتوى كامل ${index}`,
      },
    },
  };
}

function queryResult(rows: Array<Record<string, unknown>>) {
  const chain = {
    sort: jest.fn(),
    limit: jest.fn(),
    select: jest.fn(),
    lean: jest.fn().mockResolvedValue(rows),
  };
  chain.sort.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  return chain;
}

describe('public blog database listing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockCountDocuments.mockResolvedValue(40);
  });

  it('caps every page at 24 and returns a cursor that makes the tail reachable', async () => {
    const firstRows = Array.from({ length: 25 }, (_, offset) => row(40 - offset));
    const firstQuery = queryResult(firstRows);
    mockFind.mockReturnValueOnce(firstQuery);

    const first = await listPublicBlogPosts({
      tenantId: 'cairo-excursions-online',
      locale: 'en',
      limit: 999,
    });
    expect(first.posts).toHaveLength(24);
    expect(first.pagination).toMatchObject({ limit: 24, hasMore: true, total: 40 });
    expect(first.pagination.nextCursor).toEqual(expect.any(String));
    expect(firstQuery.limit).toHaveBeenCalledWith(25);
    expect(firstQuery.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });

    const cursor = decodePublicBlogCursor(first.pagination.nextCursor);
    expect(cursor).toMatchObject({ id: objectId(17) });

    const tailQuery = queryResult([row(16), row(15)]);
    mockFind.mockReturnValueOnce(tailQuery);
    const tail = await listPublicBlogPosts({
      tenantId: 'cairo-excursions-online',
      cursor: first.pagination.nextCursor,
    });
    expect(tail.posts.map((post) => post.slug)).toEqual(['post-16', 'post-15']);
    expect(tail.pagination).toMatchObject({ hasMore: false, nextCursor: null });
    expect(mockFind).toHaveBeenLastCalledWith(expect.objectContaining({
      $and: expect.arrayContaining([
        expect.objectContaining({
          $or: expect.arrayContaining([
            { createdAt: { $lt: new Date('2026-08-17T12:00:00.000Z') } },
          ]),
        }),
      ]),
    }));
  });

  it('applies tenant, category, author, and escaped search filters in Mongo before pagination', () => {
    const query = buildPublicBlogListQuery({
      tenantId: 'cairo-excursions-online',
      category: 'destination-guides',
      authorSlug: 'egypt-excursions-online-team',
      search: '(cairo)+',
      locale: 'ar',
      cursor: encodePublicBlogCursor({
        createdAt: '2026-08-20T12:00:00.000Z',
        _id: objectId(20),
      }),
    });
    expect(query).toMatchObject({
      $and: [
        {
          status: 'published',
          category: 'destination-guides',
          tenantId: 'cairo-excursions-online',
          author: { $in: expect.any(Array) },
        },
        {
          $or: [
            { title: { $regex: '\\(cairo\\)\\+', $options: 'i' } },
            { excerpt: { $regex: '\\(cairo\\)\\+', $options: 'i' } },
            { tags: { $regex: '\\(cairo\\)\\+', $options: 'i' } },
            { 'translations.ar.title': { $regex: '\\(cairo\\)\\+', $options: 'i' } },
            { 'translations.ar.excerpt': { $regex: '\\(cairo\\)\\+', $options: 'i' } },
          ],
        },
        expect.objectContaining({ $or: expect.any(Array) }),
      ],
    });
  });

  it('selects away all full-content fields and strips them again from the response', async () => {
    const query = queryResult([row(1)]);
    mockFind.mockReturnValue(query);
    const result = await listPublicBlogPosts({
      tenantId: 'cairo-excursions-online',
      locale: 'ar',
    });
    expect(PUBLIC_BLOG_LIST_PROJECTION).not.toMatch(/(^|\s)content($|\s)/);
    expect(PUBLIC_BLOG_LIST_PROJECTION).not.toContain('translations.ar.content');
    expect(query.select).toHaveBeenCalledWith(PUBLIC_BLOG_LIST_PROJECTION);
    expect(result.posts[0]).toMatchObject({ title: 'عنوان 1', excerpt: 'ملخص 1' });
    expect(result.posts[0]).not.toHaveProperty('content');
    expect(result.posts[0]).not.toHaveProperty('translations');
  });

  it('rejects malformed cursors and filters without touching Mongo', async () => {
    expect(() => parsePublicBlogListSearchParams(new URLSearchParams('limit=0')))
      .toThrow(PublicBlogListValidationError);
    await expect(listPublicBlogPosts({
      tenantId: 'cairo-excursions-online',
      category: 'not-a-category',
    })).rejects.toThrow('Unknown blog category');
    await expect(listPublicBlogPosts({
      tenantId: 'cairo-excursions-online',
      cursor: 'not-a-cursor',
    })).rejects.toThrow('Invalid blog pagination cursor');
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(mockFind).not.toHaveBeenCalled();
  });
});
