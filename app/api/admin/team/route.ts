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
import Tenant from '@/lib/models/Tenant';
import { getTenantEmailBranding } from '@/lib/tenant';

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
  tenantIds: user.tenantIds || [],
});

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

  const filter: Record<string, unknown> = { role: { $ne: 'customer' } };
  if (tenantId && tenantId !== 'all') {
    // requireAdminAuth has already verified that this brand belongs to the
    // current admin's network scope.
    filter.tenantIds = tenantId;
  } else {
    // "All brands" is still tenant-scoped. This lets a network admin use the
    // page without exposing users assigned only to another admin network.
    filter.tenantIds = { $in: auth.tenantIds };
  }

  const teamMembers = await User.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    data: teamMembers.map(sanitize),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  await dbConnect();

  const body = await request.json();
  const { firstName, lastName, email, role = 'operations', permissions } = body;

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
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'An account with this email already exists.' },
      { status: 409 },
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

  // Create a temporary password - user must set their own via invitation link
  const temporaryPassword = crypto.randomBytes(16).toString('hex');
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

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

  let user;
  try {
    user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      permissions: effectivePermissions,
      isActive: false, // Inactive until they accept invitation
      invitationToken,
      invitationExpires,
      requirePasswordChange: true,
      tenantIds: assignedTenantIds,
    });
  } catch (error) {
    // Surface validation/duplicate errors as a clean 400 instead of crashing.
    const err = error as { name?: string; code?: number; message?: string };
    if (err?.code === 11000) {
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

  const inviteeName = `${firstName} ${lastName}`.trim();
  const inviterName = auth.email || 'Admin Team';
  
  // Generate invitation link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://tourticket.app';
  const invitationLink = `${baseUrl.replace(/\/$/, '')}/accept-invitation?token=${invitationToken}`;

  // Load tenant branding for invite email
  let tenantBranding;
  try {
    const bodyTenantId = body.tenantId;
    if (bodyTenantId && bodyTenantId !== 'all') {
      const tenantConfig = await Tenant.findOne({ tenantId: bodyTenantId }).lean();
      tenantBranding = getTenantEmailBranding(tenantConfig as any, baseUrl);
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
    console.error('Failed to send admin invite email, rolling back user creation:', emailError);
    // Rollback: delete the user that was just created
    await User.findByIdAndDelete(user._id);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send invitation email. Please check email configuration and try again.' 
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, data: sanitize(user) },
    { status: 201 },
  );
}
