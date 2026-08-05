import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  AdminPermission,
  AdminRole,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';
import { EmailService } from '@/lib/email/emailService';
import { getInvitationBaseUrl } from '@/lib/auth/invitationBaseUrl';
import Tenant from '@/lib/models/Tenant';
import { getTenantEmailBranding } from '@/lib/tenant';
import {
  clearPendingAdminGrant,
  hasPortalMembership,
} from '@/lib/admin/teamMembership';

const sanitize = (user: any, visibleTenantIds?: string[]) => {
  // A pending invitee holds no admin access yet. Show the access they were
  // offered so the list reads sensibly, but never as though it were live.
  const invitationPending = Boolean(user.pendingAdminRole);
  const currentTenantIds = (user.tenantIds || []).map(String);
  const formerTenantIds = (user.formerAdminTenantIds || []).map(String);
  const relevantTenantIds = visibleTenantIds || Array.from(new Set([
    ...currentTenantIds,
    ...formerTenantIds,
  ]));
  const accessRemoved = Boolean(
    !invitationPending
    && formerTenantIds.some((id: string) => relevantTenantIds.includes(id))
    && !currentTenantIds.some((id: string) => relevantTenantIds.includes(id)),
  );

  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.pendingAdminRole || user.role,
    permissions: user.pendingAdminPermissions || user.permissions || [],
    isActive: invitationPending ? false : user.isActive,
    invitationPending,
    accessRemoved,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    tenantIds: (invitationPending && user.pendingAdminTenantIds)
      || (accessRemoved && formerTenantIds.filter((id: string) => relevantTenantIds.includes(id)))
      || user.tenantIds
      || [],
  };
};

function normalizePermissions(
  requested: unknown,
  role: AdminRole,
): AdminPermission[] {
  if (!Array.isArray(requested) || requested.length === 0) {
    return getDefaultPermissions(role);
  }

  return requested
    .filter((perm): perm is AdminPermission =>
      ADMIN_PERMISSIONS.includes(perm as AdminPermission),
    )
    .filter((value, index, self) => self.indexOf(value) === index);
}

const normalizeRole = (role: unknown): AdminRole => {
  if (typeof role === 'string' && ADMIN_ROLES.includes(role as AdminRole)) {
    return role as AdminRole;
  }
  return 'operations';
};

const _getPortalLink = () => {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';
  return `${base.replace(/\/$/, '')}/admin`;
};

const getSupportEmail = () =>
  process.env.SUPPORT_EMAIL ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  process.env.MAILGUN_FROM_EMAIL ||
  'support@egypt-excursionsonline.com';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || searchParams.get('brandId');

  // requireAdminAuth has already verified that an explicit brand belongs to the
  // current admin's network scope. "All brands" stays tenant-scoped so a network
  // admin never sees users assigned only to another admin network.
  const tenantScope: unknown = tenantId && tenantId !== 'all'
    ? tenantId
    : { $in: auth.tenantIds };

  const filter: Record<string, unknown> = {
    $and: [
      {
        $or: [
          { role: { $ne: 'customer' } },
          // Customers holding an unaccepted invitation belong on the list so
          // the invite stays visible and can be resent or withdrawn.
          { pendingAdminRole: { $exists: true } },
          { formerAdminScopes: 'multiTenant' },
        ],
      },
      {
        $or: [
          { tenantIds: tenantScope },
          { pendingAdminTenantIds: tenantScope },
          { formerAdminTenantIds: tenantScope },
        ],
      },
    ],
  };

  const teamMembers = await User.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  const visibleTenantIds = tenantId && tenantId !== 'all' ? [tenantId] : auth.tenantIds;
  return NextResponse.json({
    success: true,
    data: teamMembers.map((member) => sanitize(member, visibleTenantIds)),
  });
}

async function POSTHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  await dbConnect();

  const body = await request.json();
  const {
    firstName,
    lastName,
    email,
    role = 'operations',
    permissions,
  } = body;

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { success: false, error: 'First name, last name, and email are required.' },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(normalizedEmail)) {
    return NextResponse.json(
      { success: false, error: 'Please provide a valid email address.' },
      { status: 400 },
    );
  }
  const normalizedRole = normalizeRole(role);
  const effectivePermissions = normalizePermissions(permissions, normalizedRole);
  if (
    auth.role !== 'super_admin' &&
    (normalizedRole === 'super_admin' || effectivePermissions.includes('manageTenants'))
  ) {
    return NextResponse.json(
      { success: false, error: 'Only super administrators can grant global tenant access.' },
      { status: 403 },
    );
  }

  // Generate invitation token
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const invitationExpires = new Date();
  invitationExpires.setDate(invitationExpires.getDate() + 7); // 7 days from now

  // Assign team member to selected brand(s)
  // Accepts tenantIds (array) or tenantId (single string) for backward compatibility
  let assignedTenantIds: string[] = [];
  if (Array.isArray(body.tenantIds) && body.tenantIds.length > 0) {
    assignedTenantIds = body.tenantIds.filter((id: string) => id && id !== 'all');
  } else if (body.tenantId && body.tenantId !== 'all') {
    assignedTenantIds = [body.tenantId];
  }
  if (
    assignedTenantIds.length === 0 ||
    (auth.role !== 'super_admin' && assignedTenantIds.some((id) => !auth.tenantIds.includes(id)))
  ) {
    return tenantForbiddenResponse();
  }

  const existing = await User.findOne({ email: normalizedEmail })
    .select('+invitationToken +invitationExpires');
  let existingAccountInvitation = false;
  let user;

  if (existing) {
    const currentTenantIds = (existing.tenantIds || []).map(String);
    const missingTenantIds = assignedTenantIds.filter((id) => !currentTenantIds.includes(id));
    if (
      existing.role === 'super_admin'
      || (hasPortalMembership(existing, 'multiTenant') && missingTenantIds.length === 0)
    ) {
      return NextResponse.json(
        { success: false, error: 'This account already has access to the selected brands.' },
        { status: 409 },
      );
    }
    if (existing.pendingAdminRole && existing.invitationExpires && existing.invitationExpires > new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'A team invitation is already pending for this account. Use Resend invite instead.',
        },
        { status: 409 },
      );
    }

    // Offer access without changing the existing account. Current roles,
    // passwords, portal scopes and brand assignments stay live exactly as-is
    // until the invitee accepts this one-time invitation.
    user = await User.findOneAndUpdate(
      {
        _id: existing._id,
        ...(existing.isActive ? { isActive: true } : { isActive: false }),
        $or: [
          { pendingAdminRole: { $exists: false } },
          { invitationExpires: { $lte: new Date() } },
        ],
      },
      {
        $set: {
          invitationToken,
          invitationExpires,
          pendingAdminRole: normalizedRole,
          pendingAdminPermissions: effectivePermissions,
          pendingAdminScopes: ['multiTenant'],
          pendingAdminTenantIds: missingTenantIds.length > 0
            ? missingTenantIds
            : assignedTenantIds,
          pendingAdminInvitedAt: new Date(),
          pendingAdminInvitedBy: auth.email || 'Admin Team',
        },
      },
      { new: true, runValidators: true },
    );
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'The existing account changed. Refresh and try again.' },
        { status: 409 },
      );
    }
    existingAccountInvitation = true;
  }

  if (!user) {
    try {
      const temporaryPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      user = await User.create({
        firstName,
        lastName,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'customer',
        permissions: [],
        isActive: false, // Inactive until they accept invitation
        invitationToken,
        invitationExpires,
        requirePasswordChange: true,
        pendingAdminRole: normalizedRole,
        pendingAdminPermissions: effectivePermissions,
        pendingAdminScopes: ['multiTenant'],
        pendingAdminTenantIds: assignedTenantIds,
        pendingAdminInvitedAt: new Date(),
        pendingAdminInvitedBy: auth.email || 'Admin Team',
      });
    } catch (error) {
    // Surface validation/duplicate errors as a clean 400 instead of crashing.
    const err = error as { name?: string; code?: number; message?: string };
    if (err?.code === 11000) {
      const racedExisting = await User.findOne({ email: normalizedEmail });
      if (racedExisting) {
        return NextResponse.json(
          {
            success: false,
            error: racedExisting.pendingAdminRole
              ? 'A team invitation is already pending for this account.'
              : 'This account already exists. Refresh and invite it again.',
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 },
      );
    }
    if (err?.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: err.message || 'Invalid team member details.' },
        { status: 400 },
      );
    }
      console.error('Failed to create team member:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create team member.' },
        { status: 500 },
      );
    }
  }

  const inviteeName = `${user.firstName} ${user.lastName}`.trim();
  const inviterName = auth.email || 'Admin Team';
  
  // Generate invitation link on the same (branded) host the admin is using.
  const invitationLink = `${getInvitationBaseUrl(request)}/accept-invitation?token=${invitationToken}`;

  // Load tenant branding for invite email
  let tenantBranding;
  try {
    const bodyTenantId = body.tenantId;
    if (bodyTenantId && bodyTenantId !== 'all') {
      const tenantConfig = await Tenant.findOne({ tenantId: bodyTenantId }).lean();
      const assetBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';
      tenantBranding = getTenantEmailBranding(tenantConfig as any, assetBaseUrl);
    }
  } catch { /* ignore */ }

  // Try to send invitation email - rollback if it fails
  try {
    await EmailService.sendAdminInviteEmail({
      inviteeName: inviteeName || normalizedEmail,
      inviteeEmail: normalizedEmail,
      inviterName,
      temporaryPassword: '', // No longer sending password
      role: normalizedRole,
      permissions: effectivePermissions,
      portalLink: invitationLink,
      supportEmail: getSupportEmail(),
      tenantBranding,
    });
  } catch (emailError) {
    console.error('Failed to send admin invite email, rolling back invitation:', emailError);
    if (existingAccountInvitation) {
      // Withdraw only the invitation this request wrote. The customer's
      // identity, bookings and profile must survive an email outage.
      await User.updateOne(
        { _id: user._id, invitationToken },
        {
          $unset: {
            invitationToken: 1,
            invitationExpires: 1,
            pendingAdminTenantIds: 1,
            ...clearPendingAdminGrant(1),
          },
        },
      );
    } else {
      await User.findOneAndDelete({ _id: user._id, invitationToken });
    }
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send invitation email. Please check email configuration and try again.' 
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: sanitize(user),
      existingAccountInvitation,
      convertedExistingCustomer: existingAccountInvitation,
    },
    { status: existingAccountInvitation ? 200 : 201 },
  );
}

export const POST = withAdminAudit(POSTHandler);
