// app/api/tours/public/route.ts (PUBLIC API)
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    // Build query with tenant filter
    const query: Record<string, unknown> = { isActive: true, isPublished: true };
    
    // Multi-tenant: Filter by tenantId if provided
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('x-tenant-id');
    if (tenantId && tenantId !== 'all' && tenantId !== 'default') {
      query.tenantId = tenantId;
    }
    
    // Return public tour data with fields needed by DayTrips component
    const tours = await Tour.find(query)
      .select('title slug image description discountPrice originalPrice price duration rating reviewCount bookings tags specialOffer tenantId isFeatured destination translations')
      .populate('destination', 'name slug')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    const response = NextResponse.json({
      success: true,
      data: tours
    });

    // NO CACHING - Real-time data from admin panel
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0'
    );

    return response;
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tours' }, 
      { status: 500 }
    );
  }
}