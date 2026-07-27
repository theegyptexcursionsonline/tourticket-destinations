import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { clearPendingAdminGrant } from '@/lib/admin/teamMembership';

/** Withdraw expired network invitations without deleting shared user records. */
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  try {
    const result = await User.updateMany(
      {
        pendingAdminRole: { $exists: true },
        pendingAdminScopes: 'multiTenant',
        invitationExpires: { $lt: new Date() },
      },
      {
        $unset: {
          invitationToken: 1,
          invitationExpires: 1,
          pendingAdminTenantIds: 1,
          ...clearPendingAdminGrant(1),
        },
      },
    );

    return NextResponse.json({
      success: true,
      withdrawn: result.modifiedCount || 0,
      deleted: 0,
      message: result.modifiedCount
        ? `Withdrew ${result.modifiedCount} expired invitation${result.modifiedCount === 1 ? '' : 's'}. No user accounts were deleted.`
        : 'No expired invitations to withdraw.',
    });
  } catch (error) {
    console.error('Invitation cleanup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clean up expired invitations.' },
      { status: 500 },
    );
  }
}
