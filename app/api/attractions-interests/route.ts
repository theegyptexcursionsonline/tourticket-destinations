// app/api/attractions-interests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const requestedTenantId = (request.nextUrl.searchParams.get('tenantId') || '').trim();
    const tenantFilter = requestedTenantId && requestedTenantId !== 'all'
      ? { tenantId: requestedTenantId }
      : {};

    const pages = await AttractionPage.find({ isPublished: true, ...tenantFilter })
      .select('_id title slug pageType')
      .sort({ title: 1 })
      .lean();

    // Separate into attractions and interests
    const attractions = pages.filter(p => p.pageType === 'attraction');
    const interests = pages.filter(p => p.pageType === 'category');

    const data = { attractions, interests };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching attractions/interests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch attractions and interests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
