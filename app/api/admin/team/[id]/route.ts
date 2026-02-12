import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  AdminPermission,
  AdminRole,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';
import { EmailService } from '@/lib/email/emailService';

const sanitize = (user: any) => ({
  id: user._id.toString(),
  _id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  permissions: user.permissions || [],
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

const normalizeRole = (role: unknown): AdminRole => {
  if (typeof role === 'string' && ADMIN_ROLES.includes(role as AdminRole)) {
    return role as AdminRole;
  }
  return 'operations';
};

const normalizePermissions = (
  requested: unknown,
  role: AdminRole,
): AdminPermission[] => {
  if (!Array.isArray(requested) || requested.length === 0) {
    return getDefaultPermissions(role);
  }

  return requested
    .filter((perm): perm is AdminPermission =>
      ADMIN_PERMISSIONS.includes(perm as AdminPermission),
    )
    .filter((value, index, self) => self.indexOf(value) === index);
};

const getPortalLink = () => {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://tourticket.app';
  return `${base.replace(/\/$/, '')}/admin`;
};

const getSupportEmail = () =>
  process.env.SUPPORT_EMAIL ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  process.env.MAILGUN_FROM_EMAIL ||
  'support@tourticket.app';

const formatName = (user: any) => `${user.firstName || ''} ${user.lastName || ''}`.trim();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  await dbConnect();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, error: 'Invalid team member id' },
      { status: 400 },
    );
  }

  const updates = await request.json();
  
  // NOTE: Using findById + save pattern for email notification logic.
  // While this has a theoretical race condition risk, it's acceptable for this use case
  // since team updates are infrequent and we need pre/post values for email notifications.
  // For high-frequency updates, consider using findByIdAndUpdate with versioning.
  const user = await User.findById(id).select('+password');

  if (!user || user.role === 'customer') {
    return NextResponse.json(
      { success: false, error: 'Team member not found' },
      { status: 404 },
    );
  }

  if (updates.firstName) user.firstName = updates.firstName;
  if (updates.lastName) user.lastName = updates.lastName;
  const previousActive = user.isActive;
  const previousPermissions = [...(user.permissions || [])];
  
  if (typeof updates.isActive === 'boolean') {
    user.isActive = updates.isActive;
  }

  if (updates.role) {
    user.role = normalizeRole(updates.role);
  }

  if (updates.permissions) {
    user.permissions = normalizePermissions(updates.permissions, user.role);
  }

  if (updates.password) {
    if (updates.password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }
    user.password = await bcrypt.hash(updates.password, 10);
  }

  await user.save();

  // Send email if access status changed
  if (typeof updates.isActive === 'boolean' && updates.isActive !== previousActive) {
    EmailService.sendAdminAccessUpdateEmail({
      inviteeName: formatName(user) || user.email,
      inviteeEmail: user.email,
      updatedBy: auth.email || 'Admin Team',
      action: user.isActive ? 'activated' : 'deactivated',
      isActivated: user.isActive,
      portalLink: getPortalLink(),
      supportEmail: getSupportEmail(),
    }).catch((error) => {
      console.error('Failed to send admin access update email', error);
    });
  }
  
  // Send email if permissions changed
  else if (updates.permissions && JSON.stringify(previousPermissions.sort()) !== JSON.stringify(user.permissions.sort())) {
    EmailService.sendAdminAccessUpdateEmail({
      inviteeName: formatName(user) || user.email,
      inviteeEmail: user.email,
      updatedBy: auth.email || 'Admin Team',
      action: 'permissions_updated',
      isActivated: user.isActive,
      portalLink: getPortalLink(),
      supportEmail: getSupportEmail(),
    }).catch((error) => {
      console.error('Failed to send permission update email', error);
    });
  }

  return NextResponse.json({ success: true, data: sanitize(user) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  await dbConnect();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, error: 'Invalid team member id' },
      { status: 400 },
    );
  }

  const user = await User.findById(id);
  if (!user || user.role === 'customer') {
    return NextResponse.json(
      { success: false, error: 'Team member not found' },
      { status: 404 },
    );
  }

  // Send notification email before deleting
  EmailService.sendAdminAccessUpdateEmail({
    inviteeName: formatName(user) || user.email,
    inviteeEmail: user.email,
    updatedBy: auth.email || 'Admin Team',
    action: 'deleted',
    isActivated: false,
    portalLink: getPortalLink(),
    supportEmail: getSupportEmail(),
  }).catch((error) => {
    console.error('Failed to send admin deletion email', error);
  });

  // Permanently delete the user
  await User.findByIdAndDelete(id);

  return NextResponse.json({
    success: true,
    message: 'Team member permanently deleted.',
  });
}

