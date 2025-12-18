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
    
    // Only return public tour data
    const tours = await Tour.find(
      query,
      { 
        destination: 1, 
        title: 1, 
        price: 1, 
        duration: 1,
        tenantId: 1,
        _id: 1 
      }
    ).populate('destination', 'name slug');
    
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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tours' }, 
      { status: 500 }
    );
  }
}