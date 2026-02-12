import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import {
  ADMIN_PERMISSIONS,
  AdminPermission,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';

const INVALID_RESPONSE = NextResponse.json(
  { success: false, error: 'Invalid credentials' },
  { status: 401 },
);

function buildAdminUserPayload(user: any, permissions: AdminPermission[]) {
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role,
    permissions,
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('[LOGIN] Step 1: Parsing request body...');
    const { email, username, password } = await request.json();

    if (!password || (!email && !username)) {
      return NextResponse.json(
        { success: false, error: 'Email/username and password are required' },
        { status: 400 },
      );
    }

    const identifier = String(email || username).toLowerCase().trim();
    console.log('[LOGIN] Step 2: Identifier:', identifier);

    const envUsername = process.env.ADMIN_USERNAME?.toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD;

    // Debug logging (remove after testing)
    console.log('=== Admin Login Debug ===');
    console.log('Received identifier:', identifier);
    console.log('Env username:', envUsername);
    console.log('Env username configured:', !!envUsername);
    console.log('Env password configured:', !!envPassword);
    console.log('Identifiers match:', identifier === envUsername);
    console.log('========================');
    if (
      envUsername &&
      envPassword &&
      identifier === envUsername &&
      password === envPassword
    ) {
      console.log('[LOGIN] Step 3: Env admin login attempt...');
      const pseudoUser = {
        _id: 'env-admin',
        email: process.env.ADMIN_USERNAME,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
      };
      const permissions = [...ADMIN_PERMISSIONS];
      
      console.log('[LOGIN] Step 4: Signing token for env admin...');
      const token = await signToken(
        {
          sub: pseudoUser._id,
          email: pseudoUser.email,
          given_name: pseudoUser.firstName,
          family_name: pseudoUser.lastName,
          role: pseudoUser.role,
          permissions,
          scope: 'admin',
        },
        { expiresIn: '8h' },
      );

      console.log('[LOGIN] Step 5: Env admin login successful');
      const response = NextResponse.json({
        success: true,
        token,
        user: buildAdminUserPayload(pseudoUser, permissions),
      });
      response.cookies.set('admin-auth-token', token, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60, // 8 hours (matches JWT expiry)
      });
      return response;
    }

    console.log('[LOGIN] Step 3: Connecting to database...');
    await dbConnect();
    console.log('[LOGIN] Step 4: Database connected');

    console.log('[LOGIN] Step 5: Finding user by email...');
    const user = await User.findOne({ email: identifier }).select('+password');
    if (!user) {
      console.log('[LOGIN] User not found');
      return INVALID_RESPONSE;
    }
    console.log('[LOGIN] Step 6: User found:', user.email, 'isActive:', user.isActive);

    if (!user.isActive) {
      console.log('[LOGIN] User is not active');
      return NextResponse.json(
        { success: false, error: 'This admin account has been deactivated.' },
        { status: 403 },
      );
    }

    if (!user.password) {
      console.log('[LOGIN] User has no password');
      return INVALID_RESPONSE;
    }

    console.log('[LOGIN] Step 7: Comparing password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('[LOGIN] Invalid password');
      return INVALID_RESPONSE;
    }
    console.log('[LOGIN] Step 8: Password valid');

    if (!user.role || user.role === 'customer') {
      console.log('[LOGIN] User is not admin role:', user.role);
      return NextResponse.json(
        { success: false, error: 'This account does not have admin access.' },
        { status: 403 },
      );
    }

    console.log('[LOGIN] Step 9: Getting permissions for role:', user.role);
    const permissions =
      user.permissions && user.permissions.length > 0
        ? [...user.permissions] // Convert Mongoose array to plain array
        : getDefaultPermissions(user.role);
    console.log('[LOGIN] Permissions:', permissions);

    console.log('[LOGIN] Step 10: Updating lastLoginAt...');
    user.lastLoginAt = new Date();
    if (!user.permissions || user.permissions.length === 0) {
      user.permissions = permissions;
    }
    
    console.log('[LOGIN] Step 11: Saving user...');
    await user.save({ validateBeforeSave: false });
    console.log('[LOGIN] Step 12: User saved');

    console.log('[LOGIN] Step 13: Signing JWT token...');
    const token = await signToken(
      {
        sub: (user._id as any).toString(),
        email: user.email,
        given_name: user.firstName,
        family_name: user.lastName,
        role: user.role,
        permissions,
        scope: 'admin',
      },
      { expiresIn: '8h' },
    );
    console.log('[LOGIN] Step 14: Token signed successfully');

    console.log('[LOGIN] Step 15: Login successful for:', user.email);
    const response = NextResponse.json({
      success: true,
      token,
      user: buildAdminUserPayload(user, permissions),
    });
    response.cookies.set('admin-auth-token', token, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours (matches JWT expiry)
    });
    return response;
  } catch (error) {
    console.error('===== Admin login failed =====');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Full error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error('==============================');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred during login',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 },
    );
  }
}