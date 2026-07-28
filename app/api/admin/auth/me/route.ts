import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { allowTwoFactorEnrollment: true });
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (auth.userId === 'env-admin') {
    return NextResponse.json({
      success: true,
      user: {
        id: 'env-admin',
        _id: 'env-admin',
        email: 'admin@system.local',
        firstName: 'Super',
        lastName: 'Admin',
        name: 'Super Admin',
        role: 'super_admin',
        permissions: auth.permissions,
        tenantIds: [],
        twoFactorEnabled: true,
        twoFactorRecoveryPending: false,
      },
    });
  }

  await dbConnect();
  const user = await User.findById(auth.userId).lean();

  if (!user || user.role === 'customer') {
    return NextResponse.json(
      { success: false, error: 'Admin account not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      permissions: auth.permissions,
      tenantIds: auth.tenantIds,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      twoFactorRecoveryPending: Boolean(user.twoFactorRecoveryPending),
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    },
  });
}
