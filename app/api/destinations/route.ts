// app/api/destinations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('x-tenant-id');
    const tenantFilter =
      tenantId && tenantId !== 'all' && tenantId !== 'default' ? { tenantId } : {};

    // Fetch all published destinations
    const destinations = await Destination.find({ isPublished: true, featured: true, ...tenantFilter })
      .select('_id name slug country image description featured tourCount')
      .sort({ featured: -1, tourCount: -1, name: 1 })
      .lean();

    // Get all published tours
    const tours = await Tour.find({ isPublished: true, ...tenantFilter })
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

    // Add tour counts to destinations
    const destinationsWithCountsData = destinations.map(dest => ({
      ...dest,
      tourCount: tourCounts[dest._id.toString()] || 0,
    }));

    const destinationsWithCounts = destinationsWithCountsData
      .filter(dest => dest.tourCount > 0 || dest.featured)
      .sort((a, b) => {
        // Featured first
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
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