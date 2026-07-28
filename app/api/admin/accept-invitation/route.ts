// app/api/admin/accept-invitation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import {
  PENDING_ADMIN_FIELDS,
  applyPendingAdminGrant,
} from '@/lib/admin/teamMembership';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body.' },
        { status: 400 },
      );
    }
    const { token, password } = body;

    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { success: false, error: 'A valid invitation token is required.' },
        { status: 400 },
      );
    }

    const user = await User.findOne({
      invitationToken: token,
      invitationExpires: { $gt: new Date() },
      pendingAdminRole: { $exists: true },
    }).select('+invitationToken +invitationExpires +password');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired invitation token.',
        },
        { status: 400 },
      );
    }

    const granted = applyPendingAdminGrant(user);
    if (!granted) {
      return NextResponse.json(
        { success: false, error: 'This invitation is no longer pending.' },
        { status: 409 },
      );
    }

    const requiresPasswordSetup = Boolean(user.requirePasswordChange || !user.isActive);
    if (
      requiresPasswordSetup
      && (typeof password !== 'string' || password.length < 8)
    ) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long.' },
        { status: 400 },
      );
    }

    const set: Record<string, unknown> = {
      role: granted.role,
      permissions: granted.permissions,
      adminPortalScopes: granted.adminPortalScopes,
      isActive: true,
      requirePasswordChange: false,
    };
    if (granted.tenantIds) set.tenantIds = granted.tenantIds;
    if (requiresPasswordSetup) {
      set.password = await bcrypt.hash(password as string, 10);
    }

    const accepted = await User.findOneAndUpdate(
      {
        _id: user._id,
        invitationToken: token,
        invitationExpires: { $gt: new Date() },
        pendingAdminRole: user.pendingAdminRole,
      },
      {
        $set: set,
        $pull: {
          formerAdminScopes: 'multiTenant',
          formerAdminTenantIds: { $in: granted.tenantIds || [] },
        },
        $unset: {
          invitationToken: 1,
          invitationExpires: 1,
          ...Object.fromEntries(PENDING_ADMIN_FIELDS.map((field) => [field, 1])),
          pendingAdminTenantIds: 1,
        },
      },
      { new: true, runValidators: true },
    );
    if (!accepted) {
      return NextResponse.json(
        { success: false, error: 'This invitation was already accepted, withdrawn, or replaced.' },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully. You can now sign in to the admin portal.',
      email: accepted.email,
      existingAccount: !requiresPasswordSetup,
    });
  } catch (error) {
    console.error('[ACCEPT-INVITATION] Error accepting invitation:', error);
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
    }).select('firstName lastName email role pendingAdminRole requirePasswordChange isActive +invitationExpires');

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
        role: user.pendingAdminRole || user.role,
        expiresAt: user.invitationExpires,
        requiresPasswordSetup: Boolean(user.requirePasswordChange || !user.isActive),
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
