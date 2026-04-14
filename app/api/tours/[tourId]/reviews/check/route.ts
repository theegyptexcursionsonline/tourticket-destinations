// app/api/tours/[tourId]/reviews/check/route.ts
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Review from '@/lib/models/Review';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import mongoose from 'mongoose';

interface Params {
  tourId: string;
}

const REVIEW_ELIGIBLE_STATUSES = ['Confirmed', 'Completed', 'confirmed', 'completed'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  await dbConnect();
  
  try {
    const { tourId } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return NextResponse.json({ hasReview: false });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ hasReview: false });
    }

    const token = authHeader.split(' ')[1];
    let userId: string;

    // Try Firebase authentication first
    const firebaseResult = await verifyFirebaseToken(token);

    if (firebaseResult.success && firebaseResult.uid) {
      // Find user by Firebase UID
      const user = await User.findOne({ firebaseUid: firebaseResult.uid });

      if (!user) {
        return NextResponse.json({ hasReview: false });
      }

      userId = (user._id as any).toString();
    } else {
      // Fallback to JWT (for backwards compatibility)
      const payload = await verifyToken(token);
      if (!payload || !payload.sub) {
        return NextResponse.json({ hasReview: false });
      }

      userId = payload.sub as string;
    }

    const existingReview = await Review.findOne({
      tour: new mongoose.Types.ObjectId(tourId),
      user: new mongoose.Types.ObjectId(userId)
    });

    if (existingReview) {
      return NextResponse.json({
        hasReview: true,
        canReview: false,
        reason: 'already_reviewed',
        review: {
          _id: existingReview._id,
          rating: existingReview.rating,
          title: existingReview.title,
          comment: existingReview.comment,
          createdAt: existingReview.createdAt
        }
      });
    }

    const tour = await Tour.findById(tourId).select('tenantId').lean();
    if (!tour) {
      return NextResponse.json({ hasReview: false, canReview: false, reason: 'tour_not_found' });
    }

    const eligibleBooking = await Booking.findOne({
      tour: new mongoose.Types.ObjectId(tourId),
      user: new mongoose.Types.ObjectId(userId),
      tenantId: (tour as any).tenantId,
      status: { $in: REVIEW_ELIGIBLE_STATUSES },
      date: { $lt: new Date() },
    })
      .select('_id')
      .lean();

    return NextResponse.json({
      hasReview: false,
      canReview: Boolean(eligibleBooking),
      reason: eligibleBooking ? null : 'verified_booking_required',
    });

  } catch (error: any) {
    console.error('Check existing review error:', error);
    return NextResponse.json({ hasReview: false, canReview: false, reason: 'review_check_failed' });
  }
}
