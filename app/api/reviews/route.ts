import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';
import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { verifyToken } from '@/lib/jwt';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import Tour from '@/lib/models/Tour';

// POST a new review - requires authentication
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Use the tour review endpoint to submit verified reviews.' },
    { status: 410 },
  );
}

async function legacyReviewCreation(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to submit a review' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let userId: string | undefined;

    // Try Firebase auth first
    const firebaseResult = await verifyFirebaseToken(token);
    if (firebaseResult.success && firebaseResult.uid) {
      const user = await User.findOne({ firebaseUid: firebaseResult.uid });
      if (user) {
        userId = (user._id as any).toString();
      }
    }

    // Fallback to JWT
    if (!userId) {
      const payload = await verifyToken(token);
      if (payload && payload.sub) {
        userId = payload.sub as string;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    // Override userId from token to prevent spoofing
    body.user = userId;
    body.userId = userId;

    const review = await Review.create(body);
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
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
