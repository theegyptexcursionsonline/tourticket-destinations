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
import {
  clearPendingAdminGrant,
  revokePortalScope,
} from '@/lib/admin/teamMembership';
import { guardTeamMutation } from '@/lib/auth/teamMutationGuards';

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
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';
  return `${base.replace(/\/$/, '')}/admin`;
};

const getSupportEmail = () =>
  process.env.SUPPORT_EMAIL ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  process.env.MAILGUN_FROM_EMAIL ||
  'support@egypt-excursionsonline.com';

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
  if (
    auth.role !== 'super_admin' &&
    (updates.role === 'super_admin' ||
      (Array.isArray(updates.permissions) && updates.permissions.includes('manageTenants')))
  ) {
    return NextResponse.json(
      { success: false, error: 'Only super administrators can grant global tenant access.' },
      { status: 403 },
    );
  }
  
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
  if (user.pendingAdminScopes?.includes('multiTenant')) {
    return NextResponse.json(
      { success: false, error: 'Accept or withdraw the pending invitation before editing access.' },
      { status: 409 },
    );
  }
  if (user.role === 'super_admin' && auth.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Only super administrators can modify this account.' },
      { status: 403 },
    );
  }
  if (auth.role !== 'super_admin' && !(user.tenantIds || []).some((tenantId) => auth.tenantIds.includes(tenantId))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Prevent self-lockout and removal of the last active super administrator.
  const resultingRole = updates.role ? normalizeRole(updates.role) : user.role;
  const isDeactivating = updates.isActive === false;
  const isDemoting = user.role === 'super_admin' && resultingRole !== 'super_admin';
  if (isDeactivating || isDemoting) {
    let otherActiveSuperAdmins = Infinity;
    if (user.role === 'super_admin' && user.isActive) {
      otherActiveSuperAdmins = await User.countDocuments({
        role: 'super_admin',
        isActive: true,
        _id: { $ne: user._id },
      });
    }
    const guard = guardTeamMutation({
      actorUserId: auth.userId,
      targetUserId: String(user._id),
      targetRole: user.role,
      targetIsActive: user.isActive,
      action: isDeactivating ? 'deactivate' : 'demote',
      otherActiveSuperAdmins,
    });
    if (!guard.ok) {
      return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
    }
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

  const user = await User.findById(id).select('+invitationToken +invitationExpires');
  if (!user || (user.role === 'customer' && !user.pendingAdminRole)) {
    return NextResponse.json(
      { success: false, error: 'Team member not found' },
      { status: 404 },
    );
  }
  const hasPendingNetworkInvite = Boolean(
    user.pendingAdminRole && user.pendingAdminScopes?.includes('multiTenant'),
  );
  if (user.role === 'super_admin' && auth.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Only super administrators can delete this account.' },
      { status: 403 },
    );
  }
  // Brands the caller is entitled to withdraw, covering both live assignments
  // and an invitation that has not been accepted yet.
  const targetTenantIds = [
    ...(user.tenantIds || []),
    ...(user.pendingAdminTenantIds || []),
  ].map(String);
  const requestedTenantId = request.nextUrl.searchParams.get('tenantId');
  const candidateTenantIds = requestedTenantId && requestedTenantId !== 'all'
    ? targetTenantIds.filter((tenantId) => tenantId === requestedTenantId)
    : targetTenantIds;
  const removableTenantIds = auth.role === 'super_admin'
    ? Array.from(new Set(candidateTenantIds))
    : Array.from(new Set(candidateTenantIds.filter((tenantId) => auth.tenantIds.includes(tenantId))));

  if (removableTenantIds.length === 0) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (hasPendingNetworkInvite) {
    const pendingTenantIds = (user.pendingAdminTenantIds || []).map(String);
    const remainingPendingTenantIds = pendingTenantIds.filter(
      (tenantId) => !removableTenantIds.includes(tenantId),
    );
    const update = remainingPendingTenantIds.length > 0
      ? { $set: { pendingAdminTenantIds: remainingPendingTenantIds } }
      : {
          $unset: {
            invitationToken: 1,
            invitationExpires: 1,
            pendingAdminTenantIds: 1,
            ...clearPendingAdminGrant(1),
          },
        };
    const withdrawn = await User.updateOne(
      {
        _id: user._id,
        pendingAdminRole: user.pendingAdminRole,
        pendingAdminScopes: 'multiTenant',
      },
      update,
    );
    if (withdrawn.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'The invitation changed. Refresh and try again.' },
        { status: 409 },
      );
    }
    return NextResponse.json({
      success: true,
      outcome: remainingPendingTenantIds.length > 0
        ? 'pending_brands_removed'
        : 'invitation_withdrawn',
      removedTenantIds: removableTenantIds,
      message: remainingPendingTenantIds.length > 0
        ? 'Selected brands removed from the pending invitation. Existing access is unchanged.'
        : 'Invitation withdrawn. The existing account and access remain unchanged.',
    });
  }

  // Prevent self-deletion and deletion of the last active super administrator.
  let otherActiveSuperAdmins = Infinity;
  if (user.role === 'super_admin' && user.isActive) {
    otherActiveSuperAdmins = await User.countDocuments({
      role: 'super_admin',
      isActive: true,
      _id: { $ne: user._id },
    });
  }
  const guard = guardTeamMutation({
    actorUserId: auth.userId,
    targetUserId: String(user._id),
    targetRole: user.role,
    targetIsActive: user.isActive,
    action: 'delete',
    otherActiveSuperAdmins,
  });
  if (!guard.ok) {
    return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
  }

  const revocation = revokePortalScope(user, 'multiTenant', {
    removeTenantIds: removableTenantIds,
  });

  const update: Record<string, unknown> = {
    $unset: {
      invitationToken: 1,
      invitationExpires: 1,
      pendingAdminTenantIds: 1,
      ...clearPendingAdminGrant(1),
    },
  };

  if (revocation.outcome === 'reverted_to_customer') {
    // Never delete the person. Bookings, profile and storefront sign-in belong
    // to them, not to the admin role being removed.
    update.$set = { role: 'customer', permissions: [], tenantIds: [] };
    (update.$unset as Record<string, unknown>).adminPortalScopes = 1;
  } else {
    update.$set = {
      adminPortalScopes: revocation.adminPortalScopes,
      tenantIds: revocation.tenantIds,
    };
  }

  await User.updateOne({ _id: user._id }, update);

  EmailService.sendAdminAccessUpdateEmail({
    inviteeName: formatName(user) || user.email,
    inviteeEmail: user.email,
    updatedBy: auth.email || 'Admin Team',
    action: 'deleted',
    isActivated: false,
    portalLink: getPortalLink(),
    supportEmail: getSupportEmail(),
  }).catch((error) => {
    console.error('Failed to send admin access removal email', error);
  });

  return NextResponse.json({
    success: true,
    outcome: revocation.outcome,
    removedTenantIds: removableTenantIds,
    message: revocation.outcome === 'reverted_to_customer'
        ? 'Removed from the team. The account keeps its customer profile, bookings and sign-in.'
        : 'Removed from the selected brands. Their other brands and portals are unchanged.',
  });
}
