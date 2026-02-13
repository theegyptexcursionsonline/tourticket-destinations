import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { authenticateFirebaseUser } from '@/lib/firebase/authHelpers';

/**
 * GET /api/user/cart
 * Get user's cart
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

    const user = await User.findById(authResult.user!._id).select('cart');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cart: user.cart || [],
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cart' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/cart
 * Sync entire cart (replace with new cart)
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

    const { cart } = await request.json();

    if (!Array.isArray(cart)) {
      return NextResponse.json(
        { success: false, error: 'Cart must be an array' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Transform cart items to match schema
    const cartItems = cart.map((item: any) => ({
      tourId: item.id || item.tourId,
      tourSlug: item.slug || item.tourSlug,
      tourTitle: item.title || item.tourTitle,
      tourImage: item.image || item.tourImage,
      selectedDate: item.selectedDate,
      selectedTime: item.selectedTime,
      quantity: item.quantity || 1,
      childQuantity: item.childQuantity || 0,
      adultPrice: item.adultPrice || item.price || 0,
      childPrice: item.childPrice || 0,
      selectedAddOns: item.selectedAddOns || [],
      uniqueId: item.uniqueId,
      addedAt: item.addedAt || new Date(),
    }));

    const user = await User.findByIdAndUpdate(
      authResult.user!._id,
      { cart: cartItems },
      { new: true }
    ).select('cart');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cart: user.cart || [],
    });
  } catch (error) {
    console.error('Sync cart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync cart' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/cart
 * Add an item to cart
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

    const item = await request.json();

    if (!item.tourId && !item.id) {
      return NextResponse.json(
        { success: false, error: 'Tour ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const cartItem = {
      tourId: item.id || item.tourId,
      tourSlug: item.slug || item.tourSlug,
      tourTitle: item.title || item.tourTitle,
      tourImage: item.image || item.tourImage,
      selectedDate: item.selectedDate,
      selectedTime: item.selectedTime,
      quantity: item.quantity || 1,
      childQuantity: item.childQuantity || 0,
      adultPrice: item.adultPrice || item.price || 0,
      childPrice: item.childPrice || 0,
      selectedAddOns: item.selectedAddOns || [],
      uniqueId: item.uniqueId,
      addedAt: new Date(),
    };

    // Check if item with same uniqueId exists
    const user = await User.findById(authResult.user!._id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const existingIndex = user.cart?.findIndex(
      (c: any) => c.uniqueId === item.uniqueId
    );

    let updatedUser;
    if (existingIndex !== undefined && existingIndex >= 0) {
      // Update existing item
      updatedUser = await User.findByIdAndUpdate(
        authResult.user!._id,
        {
          $set: {
            [`cart.${existingIndex}.quantity`]:
              (user.cart![existingIndex] as any).quantity + (item.quantity || 1),
          },
        },
        { new: true }
      ).select('cart');
    } else {
      // Add new item
      updatedUser = await User.findByIdAndUpdate(
        authResult.user!._id,
        { $push: { cart: cartItem } },
        { new: true }
      ).select('cart');
    }

    return NextResponse.json({
      success: true,
      cart: updatedUser?.cart || [],
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/cart
 * Remove an item from cart or clear cart
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
    const uniqueId = searchParams.get('uniqueId');
    const clearAll = searchParams.get('clearAll') === 'true';

    await dbConnect();

    let user;

    if (clearAll) {
      // Clear entire cart
      user = await User.findByIdAndUpdate(
        authResult.user!._id,
        { cart: [] },
        { new: true }
      ).select('cart');
    } else if (uniqueId) {
      // Remove specific item
      user = await User.findByIdAndUpdate(
        authResult.user!._id,
        { $pull: { cart: { uniqueId } } },
        { new: true }
      ).select('cart');
    } else {
      return NextResponse.json(
        { success: false, error: 'uniqueId or clearAll parameter required' },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cart: user.cart || [],
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove from cart' },
      { status: 500 }
    );
  }
}
