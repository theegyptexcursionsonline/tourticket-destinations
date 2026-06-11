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
import { buildStrictTenantQuery, getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

// Enable ISR with 60 second revalidation for instant page loads
export const dynamic = 'force-dynamic';

// Generate dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `All Categories & Interests | ${tenant.name}`,
        description: `Explore all tour categories and interests. Discover adventure tours, cultural experiences, boat tours, desert experiences, and more with ${tenant.name}.`,
        openGraph: {
          title: `All Categories & Interests | ${tenant.name}`,
          description: 'Explore all tour categories and interests.',
          type: 'website',
          siteName: tenant.name,
          images: [tenant.seo.ogImage],
        },
      };
    }
  } catch (error) {
    console.error('Error generating interests page metadata:', error);
  }
  
  return {
    title: 'All Categories & Interests',
    description: 'Explore all tour categories and interests.',
  };
}

interface CategoryWithCount extends ICategory {
  tourCount: number;
}

// Server-side function to fetch tenant categories and their tour counts
async function getCategoriesWithTourCounts(tenantId: string): Promise<CategoryWithCount[]> {
  await dbConnect(tenantId);

  const categoryQuery = buildStrictTenantQuery({ isPublished: true }, tenantId);
  const tourQuery = buildStrictTenantQuery({ isPublished: true }, tenantId);

  const [categories, categoryCounts] = await Promise.all([
    Category.find(categoryQuery)
      .sort({ order: 1, name: 1 })
      .lean(),
    Tour.aggregate([
      { $match: tourQuery },
      { $unwind: '$category' },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(
    categoryCounts.map((item: { _id: unknown; count: number }) => [
      String(item._id),
      Number(item.count) || 0,
    ])
  );

  const categoriesWithCounts = categories.map((cat) => ({
    ...cat,
    tourCount: countMap.get(String(cat._id)) || 0,
  }));

  // Serialize the data to pass to the client component
  return JSON.parse(JSON.stringify(categoriesWithCounts));
}

// The main server component for the /interests route
export default async function InterestsIndexPage() {
  const tenantId = await getTenantFromRequest();
  const categories = await getCategoriesWithTourCounts(tenantId);

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
