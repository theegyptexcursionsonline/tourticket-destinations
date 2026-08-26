import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { resolveAuthor } from '@/lib/blogAuthors';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import type { ImageMetadata } from '@/lib/content/imageMetadata';

export const PUBLIC_BLOG_MAX_PAGE_SIZE = 24;
export const PUBLIC_BLOG_DEFAULT_PAGE_SIZE = 24;
const BLOG_LIST_TRANSLATION_PROJECTION = ['en', 'ar', 'es', 'fr', 'ru', 'de']
  .flatMap((locale) => [
    `translations.${locale}.title`,
    `translations.${locale}.excerpt`,
    `translations.${locale}.metaTitle`,
    `translations.${locale}.metaDescription`,
  ]);

export const PUBLIC_BLOG_LIST_PROJECTION = [
  '_id',
  'title',
  'slug',
  'excerpt',
  'featuredImage',
  'imageMetadata',
  'category',
  'author',
  'authorAvatar',
  'authorBio',
  'publishedAt',
  'createdAt',
  'readTime',
  'views',
  'likes',
  'tags',
  'featured',
  ...BLOG_LIST_TRANSLATION_PROJECTION,
].join(' ');

export const BLOG_CATEGORY_VALUES = [
  'travel-tips',
  'destination-guides',
  'food-culture',
  'adventure',
  'budget-travel',
  'luxury-travel',
  'solo-travel',
  'family-travel',
  'photography',
  'local-insights',
  'seasonal-travel',
  'transportation',
  'accommodation',
  'news-updates',
] as const;

const BLOG_CATEGORIES = new Set<string>(BLOG_CATEGORY_VALUES);
const BLOG_LOCALES = new Set(['en', 'ar', 'es', 'fr', 'ru', 'de']);
const BLOG_TRANSLATION_FIELDS = ['title', 'excerpt', 'metaTitle', 'metaDescription'];
const MAX_SEARCH_LENGTH = 100;
const MAX_CURSOR_LENGTH = 500;
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

type BlogCursor = {
  version: 1;
  createdAt: string;
  id: string;
};

export type PublicBlogListItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  imageMetadata?: ImageMetadata[];
  category: string;
  author: string;
  authorAvatar?: string;
  authorBio?: string;
  publishedAt?: string;
  createdAt: string;
  readTime?: number;
  views?: number;
  likes?: number;
  tags: string[];
  featured?: boolean;
};

export type PublicBlogListPage = {
  posts: PublicBlogListItem[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
    total: number;
  };
};

export class PublicBlogListValidationError extends Error {}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactCaseInsensitive(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value)}$`, 'i');
}

function authorFilter(authorSlug: string): Record<string, unknown> {
  const known = resolveAuthor(authorSlug);
  if (known) {
    return { author: { $in: known.aliases.map(exactCaseInsensitive) } };
  }
  const normalized = authorSlug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new PublicBlogListValidationError('author must be a lowercase slug');
  }
  const authorPattern = normalized.split('-').map(escapeRegex).join('[\\s_-]+');
  return { author: { $regex: `^${authorPattern}$`, $options: 'i' } };
}

export function encodePublicBlogCursor(input: { createdAt: Date | string; _id: unknown }): string {
  const createdAt = input.createdAt instanceof Date
    ? new Date(input.createdAt.getTime())
    : new Date(input.createdAt);
  const id = String(input._id);
  if (!Number.isFinite(createdAt.getTime()) || !OBJECT_ID_PATTERN.test(id)) {
    throw new Error('Cannot encode an invalid blog cursor');
  }
  const cursor: BlogCursor = {
    version: 1,
    createdAt: createdAt.toISOString(),
    id: id.toLowerCase(),
  };
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodePublicBlogCursor(value: string | null | undefined): BlogCursor | null {
  if (!value) return null;
  if (value.length > MAX_CURSOR_LENGTH) {
    throw new PublicBlogListValidationError('Invalid blog pagination cursor');
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<BlogCursor>;
    const date = typeof parsed.createdAt === 'string' ? new Date(parsed.createdAt) : null;
    if (
      parsed.version !== 1
      || !date
      || !Number.isFinite(date.getTime())
      || typeof parsed.id !== 'string'
      || !OBJECT_ID_PATTERN.test(parsed.id)
    ) {
      throw new Error('invalid cursor payload');
    }
    return {
      version: 1,
      createdAt: date.toISOString(),
      id: parsed.id.toLowerCase(),
    };
  } catch {
    throw new PublicBlogListValidationError('Invalid blog pagination cursor');
  }
}

export type PublicBlogListOptions = {
  tenantId: string;
  locale?: string;
  limit?: number;
  cursor?: string | null;
  search?: string;
  category?: string;
  featuredOnly?: boolean;
  authorSlug?: string;
};

function normalizeOptions(options: PublicBlogListOptions) {
  const locale = (options.locale || 'en').trim().toLowerCase();
  if (!BLOG_LOCALES.has(locale)) {
    throw new PublicBlogListValidationError('Unsupported blog locale');
  }
  const search = (options.search || '').trim();
  if (search.length > MAX_SEARCH_LENGTH) {
    throw new PublicBlogListValidationError(
      `search must be at most ${MAX_SEARCH_LENGTH} characters`,
    );
  }
  const category = (options.category || '').trim();
  if (category && !BLOG_CATEGORIES.has(category)) {
    throw new PublicBlogListValidationError('Unknown blog category');
  }
  const authorSlug = options.authorSlug?.trim() || '';
  if (authorSlug.length > MAX_SEARCH_LENGTH) {
    throw new PublicBlogListValidationError(
      `author must be at most ${MAX_SEARCH_LENGTH} characters`,
    );
  }
  const requestedLimit = typeof options.limit === 'number' && Number.isFinite(options.limit)
    ? Math.floor(options.limit)
    : PUBLIC_BLOG_DEFAULT_PAGE_SIZE;
  const limit = Math.min(PUBLIC_BLOG_MAX_PAGE_SIZE, Math.max(1, requestedLimit));
  return {
    locale,
    search,
    category,
    limit,
    cursor: decodePublicBlogCursor(options.cursor),
    authorSlug,
    featuredOnly: options.featuredOnly === true,
  };
}

function queryClauses(
  tenantId: string,
  input: ReturnType<typeof normalizeOptions>,
  includeCursor: boolean,
): Record<string, unknown>[] {
  const scope = {
    tenantId,
    status: 'published',
    ...(input.category ? { category: input.category } : {}),
    ...(input.featuredOnly ? { featured: true } : {}),
    ...(input.authorSlug ? authorFilter(input.authorSlug) : {}),
  };
  const clauses: Record<string, unknown>[] = [scope];
  if (input.search) {
    const escaped = escapeRegex(input.search);
    const localizedSearch = input.locale === 'en'
      ? []
      : [
          { [`translations.${input.locale}.title`]: { $regex: escaped, $options: 'i' } },
          { [`translations.${input.locale}.excerpt`]: { $regex: escaped, $options: 'i' } },
        ];
    clauses.push({
      $or: [
        { title: { $regex: escaped, $options: 'i' } },
        { excerpt: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } },
        ...localizedSearch,
      ],
    });
  }
  if (includeCursor && input.cursor) {
    const createdAt = new Date(input.cursor.createdAt);
    // Mongoose casts this validated 24-character hex value to ObjectId when
    // executing the Blog query. Keeping the cursor helper BSON-free also keeps
    // it usable in the Jest/Next runtime without importing Mongo's ESM bundle.
    const id = input.cursor.id;
    clauses.push({
      $or: [
        { createdAt: { $lt: createdAt } },
        { createdAt, _id: { $lt: id } },
      ],
    });
  }
  return clauses;
}

export function buildPublicBlogListQuery(
  options: PublicBlogListOptions,
  includeCursor = true,
): Record<string, unknown> {
  const input = normalizeOptions(options);
  return { $and: queryClauses(options.tenantId, input, includeCursor) };
}

export async function listPublicBlogPosts(
  options: PublicBlogListOptions,
): Promise<PublicBlogListPage> {
  const input = normalizeOptions(options);
  await dbConnect(options.tenantId);
  const pageQuery = { $and: queryClauses(options.tenantId, input, true) };
  const countQuery = { $and: queryClauses(options.tenantId, input, false) };

  const [rows, total] = await Promise.all([
    Blog.find(pageQuery)
      .sort({ createdAt: -1, _id: -1 })
      .limit(input.limit + 1)
      .select(PUBLIC_BLOG_LIST_PROJECTION)
      .lean(),
    Blog.countDocuments(countQuery),
  ]);
  const hasMore = rows.length > input.limit;
  const pageRows = rows.slice(0, input.limit);
  const serialized = JSON.parse(JSON.stringify(pageRows)) as Array<Record<string, unknown>>;
  const posts = serialized.map((record) => {
    const localized = localizeEntityFields(record, input.locale, BLOG_TRANSLATION_FIELDS);
    return {
      _id: String(localized._id),
      title: String(localized.title || ''),
      slug: String(localized.slug || ''),
      excerpt: String(localized.excerpt || ''),
      featuredImage: String(localized.featuredImage || ''),
      ...(Array.isArray(localized.imageMetadata)
        ? { imageMetadata: localized.imageMetadata as ImageMetadata[] }
        : {}),
      category: String(localized.category || ''),
      author: String(localized.author || ''),
      ...(typeof localized.authorAvatar === 'string'
        ? { authorAvatar: localized.authorAvatar }
        : {}),
      ...(typeof localized.authorBio === 'string' ? { authorBio: localized.authorBio } : {}),
      ...(typeof localized.publishedAt === 'string'
        ? { publishedAt: localized.publishedAt }
        : {}),
      createdAt: String(localized.createdAt || ''),
      ...(typeof localized.readTime === 'number' ? { readTime: localized.readTime } : {}),
      ...(typeof localized.views === 'number' ? { views: localized.views } : {}),
      ...(typeof localized.likes === 'number' ? { likes: localized.likes } : {}),
      tags: Array.isArray(localized.tags)
        ? localized.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      ...(typeof localized.featured === 'boolean' ? { featured: localized.featured } : {}),
    } satisfies PublicBlogListItem;
  });
  const last = pageRows.at(-1);

  return {
    posts,
    pagination: {
      limit: input.limit,
      hasMore,
      nextCursor: hasMore && last ? encodePublicBlogCursor(last) : null,
      total,
    },
  };
}

export function parsePublicBlogListSearchParams(searchParams: URLSearchParams) {
  const rawLimit = searchParams.get('limit');
  if (rawLimit !== null && !/^[1-9]\d*$/.test(rawLimit)) {
    throw new PublicBlogListValidationError('limit must be a positive integer');
  }
  const featured = searchParams.get('featured');
  if (featured !== null && featured !== 'true' && featured !== 'false') {
    throw new PublicBlogListValidationError('featured must be true or false');
  }
  return {
    locale: searchParams.get('locale') || 'en',
    limit: rawLimit === null ? PUBLIC_BLOG_DEFAULT_PAGE_SIZE : Number(rawLimit),
    cursor: searchParams.get('cursor'),
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    featuredOnly: featured === 'true',
    authorSlug: searchParams.get('author') || '',
  };
}
