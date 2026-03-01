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
    const { email, username, password } = await request.json();

    if (!password || (!email && !username)) {
      return NextResponse.json(
        { success: false, error: 'Email/username and password are required' },
        { status: 400 },
      );
    }

    const identifier = String(email || username).toLowerCase().trim();

    const envUsername = process.env.ADMIN_USERNAME?.toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD;

    if (
      envUsername &&
      envPassword &&
      identifier === envUsername &&
      password === envPassword
    ) {
      const pseudoUser = {
        _id: 'env-admin',
        email: process.env.ADMIN_USERNAME,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
      };
      const permissions = [...ADMIN_PERMISSIONS];

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

      const response = NextResponse.json({
        success: true,
        token,
        user: buildAdminUserPayload(pseudoUser, permissions),
      });
      response.cookies.set('admin-auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60,
      });
      return response;
    }

    await dbConnect();

    const user = await User.findOne({ email: identifier }).select('+password');
    if (!user) {
      return INVALID_RESPONSE;
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'This admin account has been deactivated.' },
        { status: 403 },
      );
    }

    if (!user.password) {
      return INVALID_RESPONSE;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return INVALID_RESPONSE;
    }

    if (!user.role || user.role === 'customer') {
      return NextResponse.json(
        { success: false, error: 'This account does not have admin access.' },
        { status: 403 },
      );
    }

    const permissions =
      user.permissions && user.permissions.length > 0
        ? [...user.permissions]
        : getDefaultPermissions(user.role);

    user.lastLoginAt = new Date();
    if (!user.permissions || user.permissions.length === 0) {
      user.permissions = permissions;
    }

    await user.save({ validateBeforeSave: false });

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

    const response = NextResponse.json({
      success: true,
      token,
      user: buildAdminUserPayload(user, permissions),
    });
    response.cookies.set('admin-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error('Admin login failed:', error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during login',
      },
      { status: 500 },
    );
  }
}
