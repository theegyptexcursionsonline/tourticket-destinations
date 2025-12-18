// Simple test API to check if tour query works
import { NextRequest, NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') || 'orange-bay-paradise-island';
  
  try {
    // Get tenant from headers (same as getTenantFromRequest)
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || 'default';
    
    await dbConnect();
    
    const tenantFilter = tenantId !== 'default' 
      ? { $or: [{ tenantId }, { tenantId: 'default' }] }
      : {};
    
    const tour = await Tour.findOne({ slug, ...tenantFilter })
      .populate('destination', 'name slug')
      .populate('category', 'name slug')
      .sort({ tenantId: tenantId !== 'default' ? -1 : 1 })
      .lean();
    
    if (!tour) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tour not found',
        tenantId,
        slug,
        query: { slug, ...tenantFilter }
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      tenantId,
      slug,
      tour: {
        title: tour.title,
        slug: tour.slug,
        tenantId: (tour as any).tenantId,
        destination: tour.destination,
        hasImage: !!tour.image,
        hasCategory: Array.isArray(tour.category) && tour.category.length > 0,
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    }, { status: 500 });
  }
}
