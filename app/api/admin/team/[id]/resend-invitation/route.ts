import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import mongoose from 'mongoose';
import { EmailService } from '@/lib/email/emailService';
import { getInvitationBaseUrl } from '@/lib/auth/invitationBaseUrl';

const getSupportEmail = () =>
  process.env.SUPPORT_EMAIL ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  process.env.MAILGUN_FROM_EMAIL ||
  'support@egypt-excursionsonline.com';

async function POSTHandler(
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

  const user = await User.findById(id)
    .select('+invitationToken +invitationExpires');

  if (
    !user
    || !user.pendingAdminRole
    || !user.pendingAdminScopes?.includes('multiTenant')
  ) {
    return NextResponse.json(
      { success: false, error: 'Team member not found' },
      { status: 404 },
    );
  }
  const pendingTenantIds = (user.pendingAdminTenantIds || []).map(String);
  if (
    (user.pendingAdminRole === 'super_admin' && auth.role !== 'super_admin')
    || (
      auth.role !== 'super_admin'
      && !pendingTenantIds.some((tenantId) => auth.tenantIds.includes(tenantId))
    )
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const previousToken = user.invitationToken;
  const previousExpires = user.invitationExpires;
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const invitationExpires = new Date();
  invitationExpires.setDate(invitationExpires.getDate() + 7); // 7 days from now

  const rotated = await User.findOneAndUpdate(
    {
      _id: user._id,
      pendingAdminRole: user.pendingAdminRole,
      pendingAdminScopes: 'multiTenant',
    },
    { $set: { invitationToken, invitationExpires } },
    { new: true, runValidators: true },
  );
  if (!rotated) {
    return NextResponse.json(
      { success: false, error: 'The invitation changed. Refresh and try again.' },
      { status: 409 },
    );
  }

  const inviteeName = `${rotated.firstName} ${rotated.lastName}`.trim();
  const inviterName = auth.email || 'Admin Team';
  
  // Generate invitation link
  const invitationLink = `${getInvitationBaseUrl(request)}/accept-invitation?token=${invitationToken}`;

  // Send email
  try {
    await EmailService.sendAdminInviteEmail({
      inviteeName: inviteeName || rotated.email,
      inviteeEmail: rotated.email,
      inviterName,
      temporaryPassword: '', // No longer sending password
      role: user.pendingAdminRole,
      permissions: user.pendingAdminPermissions || [],
      portalLink: invitationLink,
      supportEmail: getSupportEmail(),
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
    });
  } catch (emailError) {
    console.error('Failed to resend invitation email:', emailError);
    const rollback = previousToken && previousExpires
      ? { $set: { invitationToken: previousToken, invitationExpires: previousExpires } }
      : { $unset: { invitationToken: 1, invitationExpires: 1 } };
    await User.updateOne({ _id: user._id, invitationToken }, rollback);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send invitation email. Please check email configuration and try again.' 
      },
      { status: 502 },
    );
  }
}

export const POST = withAdminAudit(POSTHandler);
