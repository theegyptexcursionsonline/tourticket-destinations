import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogClientPage from './BlogClientPage';
import { IBlog } from '@/lib/models/Blog';

// Enable ISR with 60 second revalidation for instant page loads
export const dynamic = 'force-dynamic';

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'Travel Blog - Tips, Guides & Stories | Egypt Excursions Online',
  description: 'Discover travel tips, destination guides, and inspiring stories from Egypt. Expert advice for planning your perfect Egyptian adventure.',
  openGraph: {
    title: 'Travel Blog | Egypt Excursions Online',
    description: 'Discover travel tips, destination guides, and inspiring stories from Egypt.',
    type: 'website',
  },
};

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

async function getBlogsWithCategoryCounts(): Promise<{
  blogs: IBlog[];
  categoryCounts: { value: string; label: string; count: number }[];
  featuredPosts: IBlog[];
}> {
  await dbConnect();
  
  // Get all published blogs
  const blogs = await Blog.find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .populate('relatedDestinations', 'name slug')
    .populate('relatedTours', 'title slug');

  // Get featured posts
  const featuredPosts = await Blog.find({ status: 'published', featured: true })
    .sort({ publishedAt: -1 })
    .limit(3)
    .populate('relatedDestinations', 'name slug')
    .populate('relatedTours', 'title slug');

  // Get category counts
  const categoryCounts = await Promise.all(
    categories.map(async (category) => {
      const count = await Blog.countDocuments({ 
        status: 'published', 
        category: category.value 
      });
      return { ...category, count };
    })
  );

  return {
    blogs: JSON.parse(JSON.stringify(blogs)),
    categoryCounts: categoryCounts.filter(cat => cat.count > 0),
    featuredPosts: JSON.parse(JSON.stringify(featuredPosts))
  };
}

export default async function BlogIndexPage() {
  const { blogs, categoryCounts, featuredPosts } = await getBlogsWithCategoryCounts();

  return (
    <>
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