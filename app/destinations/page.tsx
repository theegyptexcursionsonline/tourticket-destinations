import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import DestinationsClientPage from './DestinationsClientPage';
import { IDestination } from '@/lib/models/Destination';
import { getTenantFromRequest, getTenantConfig, buildTenantQuery } from '@/lib/tenant';

// Enable ISR with 60 second revalidation for instant page loads
export const dynamic = 'force-dynamic';

// Generate dynamic metadata for SEO based on tenant
export async function generateMetadata(): Promise<Metadata> {
  const tenantId = await getTenantFromRequest();
  const tenantConfig = await getTenantConfig(tenantId);
  
  const siteName = tenantConfig?.name || 'Egypt Excursions Online';
  
  return {
    title: `All Destinations | ${siteName}`,
    description: `Explore amazing destinations across Egypt. Discover tours and activities with ${siteName}.`,
    openGraph: {
      title: `All Destinations | ${siteName}`,
      description: 'Explore amazing destinations across Egypt.',
      type: 'website',
    },
  };
}

// Server-side function to fetch all destinations and their tour counts (tenant-aware)
async function getDestinationsWithTourCounts(tenantId: string): Promise<IDestination[]> {
  await dbConnect();
  
  // Build query with tenant filter
  const destinationQuery = buildTenantQuery({}, tenantId);
  
  // Fetch destinations for this tenant
  const destinations = await Destination.find(destinationQuery).lean();
  
  // If no destinations found with tenant filter, fall back to all destinations
  // This ensures backward compatibility during migration
  const destinationsToProcess = destinations.length > 0 
    ? destinations 
    : await Destination.find({}).lean();
  
  // For each destination, count the number of published tours for this tenant
  const destinationsWithCounts = await Promise.all(
    destinationsToProcess.map(async (dest) => {
      const tourQuery = buildTenantQuery({
        destination: dest._id,
        isPublished: true
      }, tenantId);
      
      const tourCount = await Tour.countDocuments(tourQuery);
      return {
        ...dest,
        tourCount: tourCount,
      };
    })
  );

  // Filter out destinations with no tours for this tenant (unless it's default tenant)
  const filteredDestinations = tenantId && tenantId !== 'default'
    ? destinationsWithCounts.filter(d => d.tourCount > 0)
    : destinationsWithCounts;

  // Serialize the data to pass to the client component
  return JSON.parse(JSON.stringify(filteredDestinations));
}

// The main server component for the /destinations route
export default async function DestinationsIndexPage() {
  const tenantId = await getTenantFromRequest();
  const destinations = await getDestinationsWithTourCounts(tenantId);

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <DestinationsClientPage destinations={destinations} />
      </main>
      <Footer />
      {/* AI Search Widget */}
      <AISearchWidget />
    </>
  );
}
