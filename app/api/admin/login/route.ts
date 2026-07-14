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
import {
  failedAdminLoginUpdate,
  loginRetryAfterSeconds,
} from '@/lib/security/adminLoginProtection';
import { recordLoginAudit } from '@/lib/auth/loginAudit';
import {
  canAccessMultiTenantAdmin,
  serializeTenantIds,
} from '@/lib/auth/serializeAdminIdentity';
import { resolveAdminNetworkTenantIds } from '@/lib/auth/adminNetworkScope';

function invalidCredentialsResponse() {
  return NextResponse.json(
    { success: false, error: 'Invalid credentials' },
    { status: 401 },
  );
}

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
    tenantIds: resolveAdminNetworkTenantIds(user.role, serializeTenantIds(user.tenantIds)),
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
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_ENV_ADMIN === 'true' &&
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
          tenantIds: [],
          scope: 'admin',
        },
        { expiresIn: '8h' },
      );

      const response = NextResponse.json({
        success: true,
        user: buildAdminUserPayload(pseudoUser, permissions),
      });
      response.cookies.set('admin-auth-token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60,
      });
      return response;
    }

    await dbConnect();

    const user = await User.findOne({ email: identifier }).select(
      '+password +failedLoginAttempts +loginLockedUntil',
    );
    if (!user) {
      // Keep nonexistent-account timing close to a real password comparison.
      await bcrypt.compare(password, '$2b$10$C6UzMDM.H6dfI/f/IKcEe.3u5W4WcXHfsvhQ4FZ9DqI7I7M.JxH1K');
      await recordLoginAudit(request.headers, identifier, 'unknown_account');
      return invalidCredentialsResponse();
    }

    const now = new Date();
    if (user.loginLockedUntil && user.loginLockedUntil > now) {
      const retryAfter = loginRetryAfterSeconds(user.loginLockedUntil, now.getTime());
      await recordLoginAudit(request.headers, identifier, 'locked');
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    if (!user.isActive) {
      await recordLoginAudit(request.headers, identifier, 'inactive');
      return NextResponse.json(
        { success: false, error: 'This admin account has been deactivated.' },
        { status: 403 },
      );
    }

    if (!user.password) {
      await recordLoginAudit(request.headers, identifier, 'wrong_password');
      return invalidCredentialsResponse();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // `$inc` is atomic, so parallel serverless invocations cannot overwrite
      // one another with a smaller counter and bypass the lockout threshold.
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { failedLoginAttempts: 1 } },
        { new: true, select: '+failedLoginAttempts' },
      );
      const updatedAttempts = updatedUser?.failedLoginAttempts
        ?? (user.failedLoginAttempts || 0) + 1;
      const protection = failedAdminLoginUpdate(updatedAttempts - 1);
      if (protection.loginLockedUntil) {
        await User.updateOne(
          { _id: user._id },
          { $set: { loginLockedUntil: protection.loginLockedUntil } },
        );
      }
      await recordLoginAudit(request.headers, identifier, protection.loginLockedUntil ? 'locked' : 'wrong_password');
      return invalidCredentialsResponse();
    }

    if (!user.role || user.role === 'customer') {
      await recordLoginAudit(request.headers, identifier, 'not_admin');
      return NextResponse.json(
        { success: false, error: 'This account does not have admin access.' },
        { status: 403 },
      );
    }

    const tenantIds = resolveAdminNetworkTenantIds(
      user.role,
      serializeTenantIds(user.tenantIds),
    );
    if (!canAccessMultiTenantAdmin(user.role, tenantIds, user.adminPortalScopes)) {
      await recordLoginAudit(request.headers, identifier, 'portal_rejected');
      return NextResponse.json(
        { success: false, error: 'This account is not assigned to this admin portal.' },
        { status: 403 },
      );
    }

    const permissions =
      user.permissions && user.permissions.length > 0
        ? [...user.permissions]
        : getDefaultPermissions(user.role);

    user.lastLoginAt = new Date();
    user.failedLoginAttempts = 0;
    user.loginLockedUntil = undefined;
    if (!user.permissions || user.permissions.length === 0) {
      user.permissions = permissions;
    }

    await user.save({ validateBeforeSave: false });
    await User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0 }, $unset: { loginLockedUntil: 1 } },
    );
    await recordLoginAudit(request.headers, identifier, 'success');

    const token = await signToken(
      {
        sub: (user._id as any).toString(),
        email: user.email,
        given_name: user.firstName,
        family_name: user.lastName,
        role: user.role,
        permissions,
        tenantIds,
        scope: 'admin',
      },
      { expiresIn: '8h' },
    );

    const response = NextResponse.json({
      success: true,
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
