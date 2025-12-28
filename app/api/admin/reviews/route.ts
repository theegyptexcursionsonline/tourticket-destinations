// app/api/admin/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';

// GET all reviews for the admin panel
export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    // Get tenant filter from query params
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    // Build filter for tenant-specific queries
    const filter: Record<string, unknown> = {};
    
    // If tenantId is specified, first get tours for that tenant, then filter reviews
    if (tenantId && tenantId !== 'all') {
      const tenantTours = await Tour.find({ tenantId }).select('_id').lean();
      const tourIds = tenantTours.map(t => t._id);
      filter.tour = { $in: tourIds };
    }

    const reviews = await Review.find(filter)
      .populate({
        path: 'user',
        model: User,
        select: 'name email', // Select fields from the User model
      })
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title tenantId', // Select fields from the Tour model
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch reviews', error: (error as Error).message }, { status: 500 });
  }
}