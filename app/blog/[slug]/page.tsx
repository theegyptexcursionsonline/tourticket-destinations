// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostClient from './BlogPostClient';
import type { IBlog } from '@/lib/models/Blog';

type Params = { slug: string };

// Enable ISR with 60 second revalidation for instant page loads
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  try {
    await dbConnect();
    const { slug } = await params;
    const blog = await Blog.findOne({ slug, status: 'published' }).lean();

    if (!blog) return { title: 'Blog Post Not Found' };

    return {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.excerpt,
      openGraph: {
        title: blog.metaTitle || blog.title,
        description: blog.metaDescription || blog.excerpt,
        images: blog.featuredImage ? [blog.featuredImage] : undefined,
        type: 'article',
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

async function getBlogPost(slug: string) {
  await dbConnect();

  const blog = await Blog.findOne({ slug, status: 'published' })
    .populate('relatedDestinations', 'name slug image')
    .populate('relatedTours', 'title slug image discountPrice')
    .lean();

  if (!blog) {
    return { blog: null, relatedPosts: [] };
  }

  // increment views (fire-and-forget style)
  Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).catch(e => {
    console.error('increment view error:', e);
  });

  const relatedPosts = await Blog.find({
    status: 'published',
    category: blog.category,
    _id: { $ne: blog._id }
  })
    .limit(3)
    .sort({ publishedAt: -1 })
    .select('title slug excerpt featuredImage author publishedAt readTime')
    .lean();

  return {
    blog: JSON.parse(JSON.stringify(blog)) as IBlog,
    relatedPosts: JSON.parse(JSON.stringify(relatedPosts)) as IBlog[],
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const { blog, relatedPosts } = await getBlogPost(slug);

  if (!blog) {
    notFound();
  }

  return (
    <>
      <Header startSolid />
      <main className="pt-20">
        <BlogPostClient blog={blog} relatedPosts={relatedPosts} />
      </main>
      <Footer />
    </>
  );
}
