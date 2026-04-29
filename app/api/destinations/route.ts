// app/api/destinations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { destinationTranslationFields } from '@/lib/i18n/translationFields';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const explicitTenantId = searchParams.get('tenantId') || request.headers.get('x-tenant-id');
    const tenantId =
      explicitTenantId && explicitTenantId !== 'all'
        ? explicitTenantId
        : await getTenantFromRequest();
    const featuredOnly = searchParams.get('featured') !== 'false';
    const locale = searchParams.get('locale') || 'en';

    await dbConnect(tenantId);

    const destinationQuery = buildStrictTenantQuery({ isPublished: true }, tenantId);
    const tourQuery = buildStrictTenantQuery({ isPublished: true }, tenantId);

    const destinations = await Destination.find({
      ...destinationQuery,
      ...(featuredOnly ? { featured: true } : {}),
    })
      .select('_id name slug country image description featured tourCount tenantId tenantIds')
      .sort({ featured: -1, tourCount: -1, name: 1 })
      .lean();

    const tours = await Tour.find(tourQuery)
      .select('destination')
      .lean();

    // Count tours per destination
    const tourCounts: Record<string, number> = {};
    tours.forEach(tour => {
      const destId = tour.destination?.toString();
      if (destId) {
        tourCounts[destId] = (tourCounts[destId] || 0) + 1;
      }
    });

    const destFields = destinationTranslationFields.map((field) => field.key);

    // Add tour counts to destinations
    const destinationsWithCountsData = destinations.map(dest =>
      localizeEntityFields(
        {
          ...dest,
          tourCount: tourCounts[(dest._id as any).toString()] || 0,
        },
        locale,
        destFields
      )
    );

    const destinationsWithCounts = filterVisibleTaxonomyEntries(destinationsWithCountsData)
      .filter(dest => (dest.tourCount || 0) > 0 || (dest as any).featured)
      .sort((a, b) => {
        // Featured first
        if ((a as any).featured && !(b as any).featured) return -1;
        if (!(a as any).featured && (b as any).featured) return 1;
        // Then by tour count
        return b.tourCount - a.tourCount;
      });

    return NextResponse.json({
      success: true,
      data: destinationsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch destinations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
