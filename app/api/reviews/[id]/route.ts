import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import { NextResponse, NextRequest } from 'next/server';
import { authenticateCustomerSession } from '@/lib/auth/customerSession';

interface Params {
  id: string;
}

// GET a single review by ID
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  await dbConnect();
  try {
    const { id } = await params;
    
    const review = await Review.findById(id)
      .select('rating title comment userName verified helpful createdAt date user')
      .populate('user', 'firstName lastName name picture');
    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

// PUT (update) a review - only by review owner
export async function PUT(request: NextRequest, { params }: { params: Promise<Params> }) {
  await dbConnect();

  try {
    // Only a customer session for an active customer account may change a review
    const authentication = await authenticateCustomerSession(request);
    if (!authentication.success) {
      return NextResponse.json({ error: authentication.error }, { status: authentication.statusCode });
    }
    const userId = String(authentication.user._id);
    const { id } = await params;

    const body = await request.json();
    const { rating, comment, title } = body;

    if (!rating || !comment?.trim()) {
      return NextResponse.json({ error: 'Rating and comment are required' }, { status: 400 });
    }

    // Find the review and check ownership
    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user owns this review (using 'user' field now)
    if (review.user.toString() !== userId) {
      return NextResponse.json({ error: 'Not authorized to edit this review' }, { status: 403 });
    }

    // Update the review
    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { 
        rating, 
        comment: comment.trim(),
        title: title?.trim() || review.title,
        userName: review.userName, // Keep existing userName
        userEmail: review.userEmail // Keep existing userEmail
      },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName name picture') as any;

    if (!updatedReview) {
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
    }

    // Transform the response to match what the frontend expects
    const transformedReview = {
      _id: updatedReview._id,
      rating: updatedReview.rating,
      title: updatedReview.title,
      comment: updatedReview.comment,
      createdAt: updatedReview.createdAt,
      user: {
        _id: updatedReview.user?._id,
        name: updatedReview.userName,
        picture: updatedReview.user?.picture
      }
    };

    return NextResponse.json({ success: true, data: transformedReview });
  } catch (error) {
    console.error('Update review error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

// DELETE a review - only by review owner
export async function DELETE(request: NextRequest, { params }: { params: Promise<Params> }) {
  await dbConnect();

  try {
    // Only a customer session for an active customer account may change a review
    const authentication = await authenticateCustomerSession(request);
    if (!authentication.success) {
      return NextResponse.json({ error: authentication.error }, { status: authentication.statusCode });
    }
    const userId = String(authentication.user._id);
    const { id } = await params;

    // Find the review and check ownership
    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user owns this review (using 'user' field now)
    if (review.user.toString() !== userId) {
      return NextResponse.json({ error: 'Not authorized to delete this review' }, { status: 403 });
    }

    // Delete the review
    await Review.deleteOne({ _id: id });
    
    return NextResponse.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
