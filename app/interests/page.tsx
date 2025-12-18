import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import InterestsClientPage from './InterestsClientPage';
import { ICategory } from '@/lib/models/Category';

// Enable ISR with 60 second revalidation for instant page loads
export const dynamic = 'force-dynamic';

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'All Categories & Interests | Egypt Excursions Online',
  description: 'Explore all tour categories and interests in Egypt. Discover adventure tours, cultural experiences, boat tours, desert experiences, and more.',
  openGraph: {
    title: 'All Categories & Interests | Egypt Excursions Online',
    description: 'Explore all tour categories and interests in Egypt.',
    type: 'website',
  },
};

interface CategoryWithCount extends ICategory {
  tourCount: number;
}

// Server-side function to fetch all categories and their tour counts
async function getCategoriesWithTourCounts(): Promise<CategoryWithCount[]> {
  await dbConnect();
  
  // Fetch all published categories
  const categories = await Category.find({ isPublished: true })
    .sort({ order: 1, name: 1 })
    .lean();
  
  // For each category, count the number of published tours
  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat) => {
      const tourCount = await Tour.countDocuments({
        category: { $in: [cat._id] },
        isPublished: true
      });
      return {
        ...cat,
        tourCount: tourCount,
      };
    })
  );

  // Serialize the data to pass to the client component
  return JSON.parse(JSON.stringify(categoriesWithCounts));
}

// The main server component for the /interests route
export default async function InterestsIndexPage() {
  const categories = await getCategoriesWithTourCounts();

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <InterestsClientPage categories={categories} />
      </main>
      <Footer />
      {/* AI Search Widget */}
      <AISearchWidget />
    </>
  );
}

