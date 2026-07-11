import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

/**
 * Cleanup endpoint to remove inactive demo/test team members
 * Keeps only the first 2 inactive users as examples
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }
  if (auth.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  try {
    // Find all inactive admin/team users with expired invitations
    const expiredInvitationsUsers = await User.find({
      role: { $ne: 'customer' },
      isActive: false,
      invitationExpires: { $lt: new Date() }, // Invitation has expired
    })
      .select('firstName lastName email invitationExpires createdAt')
      .sort({ createdAt: 1 })
      .lean();

    // Find other inactive users (no invitation or still valid)
    const otherInactiveUsers = await User.find({
      role: { $ne: 'customer' },
      isActive: false,
      $or: [
        { invitationExpires: { $exists: false } },
        { invitationExpires: null },
        { invitationExpires: { $gte: new Date() } },
      ],
    })
      .select('firstName lastName email invitationExpires createdAt')
      .sort({ createdAt: 1 })
      .lean();

    let deletedCount = 0;
    const results = {
      expiredInvitations: 0,
      excessInactive: 0,
    };

    // Always delete users with expired invitations
    if (expiredInvitationsUsers.length > 0) {
      const expiredIds = expiredInvitationsUsers.map((u) => u._id);
      const expiredResult = await User.deleteMany({
        _id: { $in: expiredIds },
      });
      results.expiredInvitations = expiredResult.deletedCount || 0;
      deletedCount += results.expiredInvitations;
    }

    // Keep the first 2 other inactive users as demo examples, delete the rest
    if (otherInactiveUsers.length > 2) {
      const usersToDelete = otherInactiveUsers.slice(2);
      const idsToDelete = usersToDelete.map((u) => u._id);
      const excessResult = await User.deleteMany({
        _id: { $in: idsToDelete },
      });
      results.excessInactive = excessResult.deletedCount || 0;
      deletedCount += results.excessInactive;
    }

    if (deletedCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No inactive team members to clean up',
        deleted: 0,
        kept: otherInactiveUsers.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} inactive team members (${results.expiredInvitations} expired invitations, ${results.excessInactive} excess inactive)`,
      deleted: deletedCount,
      details: results,
      kept: Math.min(2, otherInactiveUsers.length),
      keptUsers: otherInactiveUsers.slice(0, 2).map((u) => ({
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
      })),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup team members',
      },
      { status: 500 },
    );
  }
}
