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

export async function POST(
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
  if (
    (user.role === 'super_admin' && auth.role !== 'super_admin') ||
    (auth.role !== 'super_admin' && !(user.tenantIds || []).some((id) => auth.tenantIds.includes(id)))
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Check if user is already active
  if (user.isActive) {
    return NextResponse.json(
      { success: false, error: 'This user is already active. Use password reset instead.' },
      { status: 400 },
    );
  }

  // Generate new invitation token
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const invitationExpires = new Date();
  invitationExpires.setDate(invitationExpires.getDate() + 7); // 7 days from now

  user.invitationToken = invitationToken;
  user.invitationExpires = invitationExpires;
  await user.save({ validateBeforeSave: false });

  const inviteeName = `${user.firstName} ${user.lastName}`.trim();
  const inviterName = auth.email || 'Admin Team';
  
  // Generate invitation link
  const invitationLink = `${getInvitationBaseUrl(request)}/accept-invitation?token=${invitationToken}`;

  // Send email
  try {
    await EmailService.sendAdminInviteEmail({
      inviteeName: inviteeName || user.email,
      inviteeEmail: user.email,
      inviterName,
      temporaryPassword: '', // No longer sending password
      role: user.role,
      permissions: user.permissions,
      portalLink: invitationLink,
      supportEmail: getSupportEmail(),
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
    });
  } catch (emailError) {
    console.error('Failed to resend invitation email:', emailError);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send invitation email. Please check email configuration and try again.' 
      },
      { status: 500 },
    );
  }
}
