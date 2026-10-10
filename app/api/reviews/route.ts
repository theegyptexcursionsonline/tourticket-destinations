import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import { NextRequest, NextResponse } from 'next/server';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import Tour from '@/lib/models/Tour';

// POST a new review - requires authentication
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Use the tour review endpoint to submit verified reviews.' },
    { status: 410 },
  );
}

// GET reviews for a specific tour
export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const tourId = searchParams.get('tourId');
  if (!tourId) {
    return NextResponse.json({ success: false, message: 'Tour ID is required' }, { status: 400 });
  }
  try {
    const tenantId = await getTenantFromRequest();
    const tour = await Tour.findOne(buildStrictTenantQuery({ _id: tourId, isPublished: true }, tenantId))
      .select('_id').lean();
    if (!tour) return NextResponse.json({ success: false, message: 'Tour not found' }, { status: 404 });
    const reviews = await Review.find({ $or: [{ tour: tour._id }, { tourId: String(tour._id) }] })
      .select('rating title comment userName verified helpful createdAt date')
      .sort({ date: -1 });
    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
