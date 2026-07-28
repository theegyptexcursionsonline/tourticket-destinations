import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import {
  cleanAccountAuthenticationData,
  inspectAccountDependencies,
} from '@/lib/admin/permanentTeamAccount';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Only a super administrator can permanently delete an account.' },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid team member id.' }, { status: 400 });
  }
  if (String(auth.userId) === id) {
    return NextResponse.json({ success: false, error: 'You cannot delete your own account.' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(id);
  if (!user || !user.formerAdminScopes?.includes('multiTenant')) {
    return NextResponse.json({ success: false, error: 'Former team account not found.' }, { status: 404 });
  }
  if (
    user.role !== 'customer'
    || Boolean(user.pendingAdminRole)
    || (user.adminPortalScopes?.length || 0) > 0
    || (user.tenantIds?.length || 0) > 0
  ) {
    return NextResponse.json(
      { success: false, error: 'Remove all portal and brand access before permanently deleting this account.' },
      { status: 409 },
    );
  }

  const normalizedEmail = user.email.toLowerCase().trim();
  const dependencies = await inspectAccountDependencies(user._id, normalizedEmail);
  if (dependencies.total > 0) {
    return NextResponse.json(
      {
        success: false,
        code: 'ACCOUNT_HAS_DEPENDENCIES',
        error: 'This account has linked business records and cannot be permanently deleted.',
        dependencies: dependencies.records,
      },
      { status: 409 },
    );
  }

  const deleted = await User.findOneAndDelete({
    _id: user._id,
    role: 'customer',
    formerAdminScopes: 'multiTenant',
    pendingAdminRole: { $exists: false },
    $or: [
      { adminPortalScopes: { $exists: false } },
      { adminPortalScopes: { $size: 0 } },
    ],
    $and: [{
      $or: [
        { tenantIds: { $exists: false } },
        { tenantIds: { $size: 0 } },
      ],
    }],
  });
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: 'The account changed. Refresh and review it before trying again.' },
      { status: 409 },
    );
  }

  await cleanAccountAuthenticationData(normalizedEmail);
  await mongoose.connection.db?.collection('adminmutationaudits').insertOne({
    action: 'team_account_permanently_deleted',
    actorUserId: String(auth.userId),
    actorEmail: auth.email,
    targetUserId: id,
    targetEmail: normalizedEmail,
    portal: 'multiTenant',
    createdAt: new Date(),
  });

  return NextResponse.json({
    success: true,
    outcome: 'account_permanently_deleted',
    message: 'The account was permanently deleted after confirming that it had no linked business records.',
  });
}

