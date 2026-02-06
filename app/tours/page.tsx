// app/tours/page.tsx
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import ToursClientPage from './ToursClientPage';
import { ITour } from '@/lib/models/Tour';
import { getTenantFromRequest, getTenantConfig, buildTenantQuery } from '@/lib/tenant';

// Enable ISR with 60 second revalidation for instant page loads
export const dynamic = 'force-dynamic';

// Generate dynamic metadata for SEO based on tenant
export async function generateMetadata(): Promise<Metadata> {
  const tenantId = await getTenantFromRequest();
  const tenantConfig = await getTenantConfig(tenantId);
  
  const siteName = tenantConfig?.name || 'Egypt Excursions Online';
  
  return {
    title: `All Tours & Activities | ${siteName}`,
    description: `Browse our complete collection of tours and experiences. Find the perfect adventure for your trip with ${siteName}.`,
    openGraph: {
      title: `All Tours & Activities | ${siteName}`,
      description: `Browse our complete collection of tours and experiences.`,
      type: 'website',
    },
  };
}

// Server-side function to fetch all tours with populated data (tenant-aware)
async function getAllTours(tenantId: string): Promise<ITour[]> {
  await dbConnect();

  // If tenant has its own tours, show only those (no default fallback)
  const ownTourCount = await Tour.countDocuments({ tenantId });
  const query = ownTourCount > 0
    ? { isPublished: true, tenantId }
    : buildTenantQuery({ isPublished: true }, tenantId);

  const tours = await Tour.find(query)
    .populate('destination', 'name')
    .populate('category', 'name')
    .sort({ isFeatured: -1, createdAt: -1 }) // Featured first, then most recent
    .lean();
  
  // Serialize the data to pass to the client component
  return JSON.parse(JSON.stringify(tours));
}

// The main server component for the /tours route
export default async function ToursIndexPage() {
  const tenantId = await getTenantFromRequest();
  const tours = await getAllTours(tenantId);

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <ToursClientPage tours={tours} />
      </main>
      <Footer />
      {/* AI Search Widget */}
      <AISearchWidget />
    </>
  );
}