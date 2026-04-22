// app/tours/page.tsx
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import ToursClientPage from './ToursClientPage';
import { ITour } from '@/lib/models/Tour';
import { getTenantFromRequest, getTenantConfig, buildStrictTenantQuery } from '@/lib/tenant';
import { getLocale } from 'next-intl/server';
import { localizeAndDedupeTours } from '@/lib/translation/localizeTourCollection';
import ToursListSchema from '@/components/schema/ToursListSchema';

// ISR: revalidate every 60s — cached pages served instantly, refreshed in background
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

// Server-side function to fetch all tours with populated data (tenant-aware).
//
async function getAllTours(tenantId: string): Promise<ITour[]> {
  await dbConnect();

  const tours = await Tour.find(buildStrictTenantQuery({ isPublished: true }, tenantId))
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
  const locale = await getLocale();
  const tours = await getAllTours(tenantId);

  // Apply translations for the current locale
  const localizedTours = localizeAndDedupeTours(tours as any[], locale);

  return (
    <>
      <ToursListSchema
        tours={(localizedTours as any[]).map((t: any) => ({
          title: t.title,
          slug: t.slug,
          image: t.image,
          discountPrice: t.discountPrice,
          originalPrice: t.originalPrice,
          rating: t.rating,
          reviewCount: t.reviewCount,
          duration: t.duration,
        }))}
        listName="All Tours & Activities in Egypt"
        listDescription="Browse our complete collection of tours and experiences across Egypt"
      />
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <ToursClientPage tours={localizedTours as any} />
      </main>
      <Footer />
      <AISearchWidget />
    </>
  );
}
