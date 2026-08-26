import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogClientPage from './BlogClientPage';
import { buildStrictTenantQuery, getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { getLocale } from 'next-intl/server';
import {
  listPublicBlogPosts,
  type PublicBlogListItem,
} from '@/lib/content/publicBlogListing';

// ISR: revalidate every 60s — cached pages served instantly, refreshed in background
export const dynamic = 'force-dynamic';

// Generate dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `Travel Blog - Tips, Guides & Stories | ${tenant.name}`,
        description: `Discover travel tips, destination guides, and inspiring stories. Expert advice for planning your perfect adventure with ${tenant.name}.`,
        openGraph: {
          title: `Travel Blog | ${tenant.name}`,
          description: 'Discover travel tips, destination guides, and inspiring stories.',
          type: 'website',
          siteName: tenant.name,
          images: [tenant.seo.ogImage],
        },
      };
    }
  } catch (error) {
    console.error('Error generating blog page metadata:', error);
  }
  
  return {
    title: 'Travel Blog - Tips, Guides & Stories',
    description: 'Discover travel tips, destination guides, and inspiring stories.',
  };
}

const categories = [
  { value: 'travel-tips', label: 'Travel Tips' },
  { value: 'destination-guides', label: 'Destination Guides' },
  { value: 'food-culture', label: 'Food & Culture' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'budget-travel', label: 'Budget Travel' },
  { value: 'luxury-travel', label: 'Luxury Travel' },
  { value: 'solo-travel', label: 'Solo Travel' },
  { value: 'family-travel', label: 'Family Travel' },
  { value: 'photography', label: 'Photography' },
  { value: 'local-insights', label: 'Local Insights' },
  { value: 'seasonal-travel', label: 'Seasonal Travel' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'news-updates', label: 'News & Updates' },
];

async function getBlogsWithCategoryCounts(tenantId: string, locale: string): Promise<{
  blogs: PublicBlogListItem[];
  categoryCounts: { value: string; label: string; count: number }[];
  featuredPosts: PublicBlogListItem[];
  nextCursor: string | null;
  totalPosts: number;
}> {
  await dbConnect(tenantId);
  const [blogPage, featuredPage] = await Promise.all([
    listPublicBlogPosts({ tenantId, locale }),
    listPublicBlogPosts({ tenantId, locale, featuredOnly: true, limit: 3 }),
  ]);

  // Get category counts
  const categoryCounts = await Promise.all(
    categories.map(async (category) => {
      const count = await Blog.countDocuments(buildStrictTenantQuery({
        status: 'published', 
        category: category.value 
      }, tenantId));
      return { ...category, count };
    })
  );

  return {
    blogs: blogPage.posts,
    categoryCounts: categoryCounts.filter(cat => cat.count > 0),
    featuredPosts: featuredPage.posts,
    nextCursor: blogPage.pagination.nextCursor,
    totalPosts: blogPage.pagination.total,
  };
}

export default async function BlogIndexPage() {
  const tenantId = await getTenantFromRequest();
  const locale = await getLocale();
  const { blogs, categoryCounts, featuredPosts, nextCursor, totalPosts } =
    await getBlogsWithCategoryCounts(tenantId, locale);

  return (
    <>
      <CollectionSchema
        name="Travel Blog"
        description="Travel tips, guides, and inspiration for your Egypt adventure"
        url="/blog"
        items={blogs.map((blog) => ({
          name: blog.title,
          url: `/blog/${blog.slug}`,
          image: blog.featuredImage,
        }))}
      />
      <Header startSolid />
      <main className="min-h-screen pt-20">
        <BlogClientPage
          blogs={blogs}
          categories={categoryCounts}
          featuredPosts={featuredPosts}
          initialNextCursor={nextCursor}
          totalPosts={totalPosts}
          locale={locale}
        />
      </main>
      <Footer />
    </>
  );
}
