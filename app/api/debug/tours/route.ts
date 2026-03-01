import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const tours = await Tour.find({})
      .select('title slug isPublished destination category')
      .populate('destination', 'name')
      .populate('category', 'name')
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      totalTours: tours.length,
      tours: tours.map(tour => ({
        title: tour.title,
        slug: tour.slug,
        isPublished: tour.isPublished,
        destination: (tour.destination as any)?.name || 'No destination',
        category: (tour.category as any)?.name || 'No category'
      }))
    });
  } catch (error) {
    console.error('Debug tours error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch debug tour data',
    }, { status: 500 });
  }
}
