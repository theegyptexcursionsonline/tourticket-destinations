// app/api/destinations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { destinationTranslationFields } from '@/lib/i18n/translationFields';

const BROKEN_DESTINATION_IMAGE_IDS = ['photo-1565108941489-e2d8f69f15d8'];

function getDestinationFallbackImage(destination: { name?: unknown; slug?: unknown }): string {
  const label = `${destination.slug || ''} ${destination.name || ''}`.toLowerCase();

  if (label.includes('beach') || label.includes('island') || label.includes('bay')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80';
  }

  if (label.includes('desert') || label.includes('west-bank') || label.includes('valley')) {
    return 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80';
  }

  if (label.includes('temple') || label.includes('luxor') || label.includes('cairo') || label.includes('giza')) {
    return 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80';
  }

  return '/hero2.jpg';
}

function getSafeDestinationImage(destination: { image?: unknown; name?: unknown; slug?: unknown }): string {
  const fallbackImage = getDestinationFallbackImage(destination);
  const image = typeof destination.image === 'string' && destination.image.trim()
    ? destination.image
    : fallbackImage;

  if (BROKEN_DESTINATION_IMAGE_IDS.some((imageId) => image.includes(imageId))) {
    return fallbackImage;
  }

  return image;
}

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

    const destinationCounts = await Tour.aggregate([
      { $match: tourQuery },
      { $group: { _id: '$destination', count: { $sum: 1 } } },
    ]);

    const tourCounts = new Map(
      destinationCounts.map((item: { _id: unknown; count: number }) => [
        String(item._id),
        Number(item.count) || 0,
      ])
    );

    const destFields = destinationTranslationFields.map((field) => field.key);

    // Add tour counts to destinations
    const destinationsWithCountsData = destinations.map(dest =>
      localizeEntityFields(
        {
          ...dest,
          image: getSafeDestinationImage(dest as any),
          tourCount: tourCounts.get((dest._id as any).toString()) || 0,
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
