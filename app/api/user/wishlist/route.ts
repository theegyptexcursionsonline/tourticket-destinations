import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';
import { authenticateFirebaseUser } from '@/lib/firebase/authHelpers';

/**
 * GET /api/user/wishlist
 * Get user's wishlist with populated tour data
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateFirebaseUser(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    await dbConnect();

    const user = await User.findById(authResult.user!._id)
      .populate({
        path: 'wishlist',
        model: Tour,
        select: '_id title slug images pricing rating reviewCount duration',
      });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get wishlist' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/wishlist
 * Sync entire wishlist (replace with new list)
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateFirebaseUser(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const { wishlist } = await request.json();

    if (!Array.isArray(wishlist)) {
      return NextResponse.json(
        { success: false, error: 'Wishlist must be an array' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Extract tour IDs from the wishlist items
    const tourIds = wishlist.map((item: any) => item._id || item.id || item);

    const user = await User.findByIdAndUpdate(
      authResult.user!._id,
      { wishlist: tourIds },
      { new: true }
    ).populate({
      path: 'wishlist',
      model: Tour,
      select: '_id title slug images pricing rating reviewCount duration',
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    console.error('Sync wishlist error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync wishlist' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/wishlist
 * Add a tour to wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateFirebaseUser(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const { tourId } = await request.json();

    if (!tourId) {
      return NextResponse.json(
        { success: false, error: 'Tour ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findByIdAndUpdate(
      authResult.user!._id,
      { $addToSet: { wishlist: tourId } },
      { new: true }
    ).populate({
      path: 'wishlist',
      model: Tour,
      select: '_id title slug images pricing rating reviewCount duration',
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to wishlist' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/wishlist
 * Remove a tour from wishlist
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateFirebaseUser(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId');

    if (!tourId) {
      return NextResponse.json(
        { success: false, error: 'Tour ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findByIdAndUpdate(
      authResult.user!._id,
      { $pull: { wishlist: tourId } },
      { new: true }
    ).populate({
      path: 'wishlist',
      model: Tour,
      select: '_id title slug images pricing rating reviewCount duration',
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove from wishlist' },
      { status: 500 }
    );
  }
}
