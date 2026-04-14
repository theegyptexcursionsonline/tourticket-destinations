// app/search/page.tsx
import { Suspense } from 'react';
import { Metadata } from 'next';
import SearchClient from './SearchClient';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { Loader2 } from 'lucide-react';
import { buildTenantQuery, getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';

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
    const tenantId = await getTenantFromRequest();
    await dbConnect(tenantId);
    try {
        // Strategy: prefer taxonomy entries that actually have tours in the
        // current tenant (that's the most relevant set), but ALWAYS fall back
        // to the full list of published categories/destinations for the tenant
        // so the filter dropdowns are never empty. The previous implementation
        // would leave the widget blank any time `tours` came back empty —
        // which is what Issue #2 was about. Any content the tenant can ever
        // surface is preferable to a completely empty filter bar.

        const tenantQueryOptions = {
          includeDefault: tenantId !== 'default',
        };

        const tourQuery = buildTenantQuery({ isPublished: true }, tenantId, tenantQueryOptions);
        const tours = await Tour.find(tourQuery)
          .select('category destination')
          .lean();

        const categoryIdsWithTours = Array.from(
          new Set(
            tours.flatMap((tour: any) =>
              Array.isArray(tour.category)
                ? tour.category.map((id: any) => String(id))
                : tour.category
                  ? [String(tour.category)]
                  : []
            )
          )
        );

        const destinationIdsWithTours: string[] = Array.from(
          new Set(
            tours
              .map((tour: any): string | null => (tour.destination ? String(tour.destination) : null))
              .filter((id): id is string => Boolean(id))
          )
        );

        // Fetch the union: all published categories/destinations for the
        // tenant (so the widget is populated even with no tours) — then the
        // "with-tours" set is used only for sort ordering below.
        const [categoriesAll, destinationsAll] = await Promise.all([
            Category.find(
              buildTenantQuery({ isPublished: true }, tenantId, tenantQueryOptions),
            )
              .sort({ order: 1, name: 1 })
              .lean(),
            Destination.find(
              buildTenantQuery({ isPublished: true }, tenantId, tenantQueryOptions),
            )
              .sort({ featured: -1, name: 1 })
              .lean(),
        ]);

        // Rank so entries with live tours come first. Entries without any
        // current tours still render (important for first-run tenants that
        // haven't assigned content yet).
        const categoryIdSet = new Set(categoryIdsWithTours);
        const destinationIdSet = new Set(destinationIdsWithTours);
        const rank = <T extends { _id?: unknown }>(ids: Set<string>) => (a: T, b: T) => {
          const aHas = ids.has(String(a._id)) ? 0 : 1;
          const bHas = ids.has(String(b._id)) ? 0 : 1;
          return aHas - bHas;
        };

        const categories = [...categoriesAll].sort(rank(categoryIdSet));
        const destinations = [...destinationsAll].sort(rank(destinationIdSet));

        return {
            categories: JSON.parse(JSON.stringify(filterVisibleTaxonomyEntries(categories))),
            destinations: JSON.parse(JSON.stringify(filterVisibleTaxonomyEntries(destinations))),
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
