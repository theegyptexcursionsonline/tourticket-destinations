// app/api/admin/accept-invitation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';

export async function POST(request: NextRequest) {
  try {
    console.log('[ACCEPT-INVITATION] Step 1: Connecting to database...');
    await dbConnect();

    console.log('[ACCEPT-INVITATION] Step 2: Parsing request body...');
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and password are required.' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long.' },
        { status: 400 },
      );
    }

    console.log('[ACCEPT-INVITATION] Step 3: Finding user by token...');
    // Find user with this invitation token
    const user = await User.findOne({
      invitationToken: token,
      invitationExpires: { $gt: new Date() }, // Token not expired
    }).select('+invitationToken +invitationExpires +password');

    if (!user) {
      console.log('[ACCEPT-INVITATION] User not found or token expired');
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired invitation token.',
        },
        { status: 400 },
      );
    }

    console.log('[ACCEPT-INVITATION] Step 4: User found');
    console.log('[ACCEPT-INVITATION] Current isActive:', user.isActive);
    console.log('[ACCEPT-INVITATION] Current role:', user.role);
    console.log('[ACCEPT-INVITATION] Has password:', !!user.password);

    // Hash the new password
    console.log('[ACCEPT-INVITATION] Step 5: Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user: set password, activate account, clear invitation token
    console.log('[ACCEPT-INVITATION] Step 6: Updating user fields...');
    user.password = hashedPassword;
    user.isActive = true;
    user.invitationToken = undefined;
    user.invitationExpires = undefined;
    user.requirePasswordChange = false;
    
    console.log('[ACCEPT-INVITATION] Step 7: Saving user...');
    console.log('[ACCEPT-INVITATION] About to save - isActive:', user.isActive, 'role:', user.role);
    // Bypass validation since we're just updating password and flags
    await user.save({ validateBeforeSave: false });
    
    console.log('[ACCEPT-INVITATION] Step 8: User saved successfully');
    console.log('[ACCEPT-INVITATION] Final isActive:', user.isActive);

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully. You can now log in.',
      email: user.email,
    });
  } catch (error) {
    console.error('[ACCEPT-INVITATION] Error accepting invitation:', error);
    console.error('[ACCEPT-INVITATION] Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to accept invitation. Please try again.',
      },
      { status: 500 },
    );
  }
}

// GET endpoint to verify token validity
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required.' },
        { status: 400 },
      );
    }

    // Find user with this invitation token
    const user = await User.findOne({
      invitationToken: token,
      invitationExpires: { $gt: new Date() },
    }).select('firstName lastName email role +invitationExpires');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired invitation token.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        expiresAt: user.invitationExpires,
      },
    });
  } catch (error) {
    console.error('Error verifying invitation token:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify token. Please try again.',
      },
      { status: 500 },
    );
  }
}
