// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostClient from './BlogPostClient';
import { buildStrictTenantQuery, getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';
import BlogPostSchema from '@/components/schema/BlogPostSchema';
import FAQSchema from '@/components/schema/FAQSchema';
import { getLocale } from 'next-intl/server';
import { getLocalizedBlogPost, localizeBlogRecord } from '@/lib/content/blogReader';

type Params = { slug: string; locale?: string };

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  try {
    const tenantId = await getTenantFromRequest();
    const locale = await getLocale();
    const tenant = await getTenantPublicConfig(tenantId);
    const siteName = tenant?.name || 'Blog';
    
    await dbConnect();
    const { slug } = await params;
    const rawBlog = await Blog.findOne(buildStrictTenantQuery({ slug, status: 'published' }, tenantId)).lean();

    if (!rawBlog) return { title: 'Blog Post Not Found' };
    const blog = localizeBlogRecord(rawBlog as Record<string, unknown>, locale) as typeof rawBlog;

    return {
      title: blog.metaTitle || `${blog.title} | ${siteName}`,
      description: blog.metaDescription || blog.excerpt,
      openGraph: {
        title: blog.metaTitle || blog.title,
        description: blog.metaDescription || blog.excerpt,
        images: blog.featuredImage ? [blog.featuredImage] : (tenant?.seo.ogImage ? [tenant.seo.ogImage] : undefined),
        type: 'article',
        siteName: siteName,
        publishedTime: blog.publishedAt?.toISOString(),
        authors: blog.author ? [blog.author] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: blog.metaTitle || blog.title,
        description: blog.metaDescription || blog.excerpt,
        images: blog.featuredImage ? [blog.featuredImage] : undefined,
      },
    };
  } catch (err) {
    console.error('generateMetadata error:', err);
    return { title: 'Blog' };
  }
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tenantId = await getTenantFromRequest();
  const locale = await getLocale();
  const { blog, relatedPosts } = await getLocalizedBlogPost(slug, tenantId, locale);

  if (!blog) {
    notFound();
  }

  return (
    <>
      <BlogPostSchema
        title={(blog as any).title}
        slug={slug}
        description={(blog as any).excerpt || (blog as any).description}
        image={(blog as any).coverImage}
        author={(blog as any).author}
        publishedAt={(blog as any).createdAt}
        updatedAt={(blog as any).updatedAt}
        tags={(blog as any).tags}
      />
      <FAQSchema items={((blog as any).faqs ?? []) as { question: string; answer: string }[]} />
      <Header startSolid />
      <main className="pt-20">
        <BlogPostClient blog={blog} relatedPosts={relatedPosts} />
      </main>
      <Footer />
    </>
  );
}
