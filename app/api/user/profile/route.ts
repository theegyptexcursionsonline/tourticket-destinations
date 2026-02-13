import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { authenticateFirebaseUser, formatUserForClient } from '@/lib/firebase/authHelpers';

/**
 * PUT /api/user/profile
 * Update user profile information
 */
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate Firebase user
    const authResult = await authenticateFirebaseUser(request);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Not authenticated' },
        { status: authResult.statusCode || 401 }
      );
    }

    const user = authResult.user;

    // Parse request body
    const body = await request.json();
    const { firstName, lastName, bio, location } = body;

    // Validation
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return NextResponse.json({ error: 'Names must be at least 2 characters long' }, { status: 400 });
    }

    // Optional field validation
    if (bio && bio.length > 500) {
      return NextResponse.json({ error: 'Bio cannot exceed 500 characters' }, { status: 400 });
    }

    if (location && location.length > 100) {
      return NextResponse.json({ error: 'Location cannot exceed 100 characters' }, { status: 400 });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      user!._id,
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(bio !== undefined && { bio: bio.trim() }),
        ...(location !== undefined && { location: location.trim() })
      },
      {
        new: true,
        runValidators: true,
        select: '-password -firebaseUid' // Exclude sensitive fields
      }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);

    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
      }

      if (error.name === 'CastError') {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/user/profile
 * Retrieve current user profile information
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate Firebase user
    const authResult = await authenticateFirebaseUser(request);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Not authenticated' },
        { status: authResult.statusCode || 401 }
      );
    }

    // Format user data for response
    const userData = formatUserForClient(authResult.user);

    // Add computed name field
    const userWithName = {
      ...userData,
      name: `${userData.firstName} ${userData.lastName}`.trim()
    };

    return NextResponse.json({
      success: true,
      data: userWithName
    });

  } catch (error) {
    console.error('Profile fetch error:', error);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
