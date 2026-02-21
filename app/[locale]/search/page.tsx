// app/search/page.tsx
import { Suspense } from 'react';
import { Metadata } from 'next';
import SearchClient from './SearchClient';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import { Loader2 } from 'lucide-react';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

// Enable ISR with 60 second revalidation for instant page loads
export const dynamic = 'force-dynamic';

// Generate dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `Search Tours & Activities | ${tenant.name}`,
        description: `Search and filter through our extensive collection of tours and experiences. Find your perfect adventure with ${tenant.name}.`,
        openGraph: {
          title: `Search Tours & Activities | ${tenant.name}`,
          description: 'Search and filter through our extensive collection of tours and experiences.',
          type: 'website',
          siteName: tenant.name,
          images: [tenant.seo.ogImage],
        },
      };
    }
  } catch (error) {
    console.error('Error generating search page metadata:', error);
  }
  
  return {
    title: 'Search Tours & Activities',
    description: 'Search and filter through our extensive collection of tours and experiences.',
  };
}

async function getFilters() {
    await dbConnect();
    try {
        const [categories, destinations] = await Promise.all([
            Category.find({}).sort({ name: 1 }).lean(),
            Destination.find({}).sort({ name: 1 }).lean()
        ]);

        return {
            categories: JSON.parse(JSON.stringify(categories)),
            destinations: JSON.parse(JSON.stringify(destinations)),
        };
    } catch (error) {
        console.error("Failed to fetch filters:", error);
        return { categories: [], destinations: [] };
    }
}

// A fallback component to show while the client component is loading
function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-red-600" />
            <p className="ms-4 text-slate-500">Loading tours...</p>
        </div>
    );
}

export default async function SearchPage() {
    const { categories, destinations } = await getFilters();

    return (
        <Suspense fallback={<Loading />}>
            <SearchClient
                initialTours={[]}
                categories={categories}
                destinations={destinations}
            />
        </Suspense>
    );
}