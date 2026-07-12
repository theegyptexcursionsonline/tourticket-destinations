import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery } from '@/lib/tenant';
import { getTenantFromRequest } from '@/lib/tenant';

export async function GET(_request: NextRequest) {
  try {
    await dbConnect();

    // Per-brand isolation (Issue #8): every tenant — including `default` —
    // must be filtered strictly by its own tours OR tours that explicitly
    // ticked it in the multi-brand `tenantIds` list. The old code only
    // filtered for non-default tenants, which meant egypt-excursionsonline.com
    // (tenant=`default`) returned tours from every brand in the system and
    // mixed in German/Arabic content on the English main site.
    const tenantId = await getTenantFromRequest();
    const query: Record<string, unknown> = buildStrictTenantQuery({ isPublished: true }, tenantId);

    // Fetch tours with populated destination and category
    const tours = await Tour.find(query)
      .populate('destination', 'name slug')
      .populate('category', 'name slug')
      .select('title slug description price discountPrice duration difficulty isPublished isFeatured image tenantId')
      .lean()
      .sort({ createdAt: -1 });

    // Format the response
    const formattedTours = tours.map((tour: any) => ({
      id: tour._id.toString(),
      title: tour.title,
      slug: tour.slug,
      description: tour.description,
      price: tour.price,
      discountPrice: tour.discountPrice,
      duration: tour.duration,
      difficulty: tour.difficulty,
      isFeatured: tour.isFeatured,
      image: tour.image,
      destination: tour.destination ? {
        id: tour.destination._id?.toString(),
        name: tour.destination.name,
        slug: tour.destination.slug
      } : null,
      category: tour.category ? {
        id: tour.category._id?.toString(),
        name: tour.category.name,
        slug: tour.category.slug
      } : null
    }));

    return NextResponse.json({
      success: true,
      count: formattedTours.length,
      tours: formattedTours
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error: any) {
    console.error('Error fetching tours list:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch tours',
    }, { status: 500 });
  }
}
