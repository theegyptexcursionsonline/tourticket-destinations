import dbConnect from '@/lib/dbConnect';
import Blog, { type IBlog } from '@/lib/models/Blog';
import { buildStrictTenantQuery } from '@/lib/tenant';
import { localizeEntityFields, localizeStructuredEntries } from '@/lib/i18n/contentLocalization';

export const BLOG_TRANSLATION_FIELDS = [
  'title', 'excerpt', 'content', 'metaTitle', 'metaDescription',
];

export function localizeBlogRecord<T extends Record<string, unknown>>(blog: T, locale: string): T {
  return localizeEntityFields(
    localizeStructuredEntries(blog, locale, [{ key: 'faqs', fields: ['question', 'answer'] }]),
    locale,
    BLOG_TRANSLATION_FIELDS,
  );
}

export async function getTenantAuthorBlogRecords(
  tenantId: string,
  locale: string = 'en',
): Promise<Record<string, unknown>[]> {
  await dbConnect(tenantId);
  const records = await Blog.find(buildStrictTenantQuery({ status: 'published' }, tenantId))
    .sort({ publishedAt: -1, createdAt: -1 })
    .select(
      'title slug excerpt featuredImage category author authorAvatar authorBio publishedAt createdAt readTime views likes tags featured translations',
    )
    .lean() as unknown as Record<string, unknown>[];
  return records.map((record) => localizeBlogRecord(record, locale));
}

export async function getLocalizedBlogPost(slug: string, tenantId: string, locale: string): Promise<{
  blog: IBlog | null;
  relatedPosts: IBlog[];
}> {
  await dbConnect(tenantId);
  const blog = await Blog.findOne(buildStrictTenantQuery({ slug, status: 'published' }, tenantId))
    .populate({
      path: 'relatedDestinations',
      select: 'name slug image translations',
      match: buildStrictTenantQuery({}, tenantId),
    })
    .populate({
      path: 'relatedTours',
      select: 'title slug image discountPrice translations',
      match: buildStrictTenantQuery({}, tenantId),
    })
    .lean();
  if (!blog) return { blog: null, relatedPosts: [] };

  // The selector remains tenant-scoped even though _id is globally unique; it
  // prevents a stale/cross-tenant document from being mutated through this path.
  void Blog.updateOne(
    buildStrictTenantQuery({ _id: blog._id }, tenantId),
    { $inc: { views: 1 } },
  ).catch((error) => console.error('increment view error:', error));

  const relatedPosts = await Blog.find(buildStrictTenantQuery({
    status: 'published',
    category: blog.category,
    _id: { $ne: blog._id },
  }, tenantId))
    .limit(3)
    .sort({ publishedAt: -1 })
    .select('title slug excerpt featuredImage imageMetadata author publishedAt readTime translations')
    .lean();

  const serializedBlog = JSON.parse(JSON.stringify(blog)) as Record<string, unknown>;
  const serializedRelated = JSON.parse(JSON.stringify(relatedPosts)) as Array<Record<string, unknown>>;
  return {
    blog: localizeBlogRecord(serializedBlog, locale) as unknown as IBlog,
    relatedPosts: serializedRelated.map((post) =>
      localizeBlogRecord(post, locale)) as unknown as IBlog[],
  };
}
