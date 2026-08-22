import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogClientPage from './BlogClientPage';
import { IBlog } from '@/lib/models/Blog';
import { buildStrictTenantQuery, getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { getLocale } from 'next-intl/server';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';

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
  blogs: IBlog[];
  categoryCounts: { value: string; label: string; count: number }[];
  featuredPosts: IBlog[];
}> {
  await dbConnect();
  
  // Get all published blogs
  const blogs = await Blog.find(buildStrictTenantQuery({ status: 'published' }, tenantId))
    .sort({ publishedAt: -1 })
    .populate({
      path: 'relatedDestinations',
      select: 'name slug translations',
      match: buildStrictTenantQuery({}, tenantId),
    })
    .populate({
      path: 'relatedTours',
      select: 'title slug translations',
      match: buildStrictTenantQuery({}, tenantId),
    });

  // Get featured posts
  const featuredPosts = await Blog.find(buildStrictTenantQuery({ status: 'published', featured: true }, tenantId))
    .sort({ publishedAt: -1 })
    .limit(3)
    .populate({
      path: 'relatedDestinations',
      select: 'name slug translations',
      match: buildStrictTenantQuery({}, tenantId),
    })
    .populate({
      path: 'relatedTours',
      select: 'title slug translations',
      match: buildStrictTenantQuery({}, tenantId),
    });

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
    blogs: (JSON.parse(JSON.stringify(blogs)) as Array<Record<string, unknown>>)
      .map((blog) => localizeEntityFields(
        blog,
        locale,
        ['title', 'excerpt', 'content', 'metaTitle', 'metaDescription'],
      )) as unknown as IBlog[],
    categoryCounts: categoryCounts.filter(cat => cat.count > 0),
    featuredPosts: (JSON.parse(JSON.stringify(featuredPosts)) as Array<Record<string, unknown>>)
      .map((blog) => localizeEntityFields(
        blog,
        locale,
        ['title', 'excerpt', 'content', 'metaTitle', 'metaDescription'],
      )) as unknown as IBlog[],
  };
}

export default async function BlogIndexPage() {
  const tenantId = await getTenantFromRequest();
  const locale = await getLocale();
  const { blogs, categoryCounts, featuredPosts } = await getBlogsWithCategoryCounts(tenantId, locale);

  return (
    <>
      <CollectionSchema
        name="Travel Blog"
        description="Travel tips, guides, and inspiration for your Egypt adventure"
        url="/blog"
        items={(blogs as any[]).map((b: any) => ({
          name: b.title,
          url: `/blog/${b.slug}`,
          image: b.coverImage,
        }))}
      />
      <Header startSolid />
      <main className="min-h-screen pt-20">
        <BlogClientPage
          blogs={blogs}
          categories={categoryCounts}
          featuredPosts={featuredPosts}
        />
      </main>
      <Footer />
    </>
  );
}
