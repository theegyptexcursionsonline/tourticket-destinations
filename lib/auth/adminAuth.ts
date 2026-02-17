import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import {
  AdminPermission,
  AdminRole,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';

export interface AdminAuthContext {
  userId: string;
  email?: string;
  role: AdminRole;
  permissions: AdminPermission[];
}

interface RequireAdminOptions {
  permissions?: AdminPermission[];
  requireAll?: boolean;
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: 'Admin authorization required' },
    { status: 401 },
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    { success: false, error: 'You do not have permission to perform this action.' },
    { status: 403 },
  );
}

export async function requireAdminAuth(
  request: NextRequest,
  options: RequireAdminOptions = {},
): Promise<AdminAuthContext | NextResponse> {
  // Check Authorization header first, then fall back to cookie
  const authHeader = request.headers.get('authorization');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
  }

  // Fallback: check admin-auth-token cookie (auto-sent by browser)
  if (!token) {
    token = request.cookies.get('admin-auth-token')?.value || '';
  }

  if (!token) {
    return unauthorizedResponse();
  }

  const payload = await verifyToken(token);
  if (!payload || payload.scope !== 'admin') {
    return unauthorizedResponse();
  }

  const role = (payload.role as AdminRole) || 'customer';
  const permissionsFromToken = Array.isArray(payload.permissions)
    ? (payload.permissions as AdminPermission[])
    : getDefaultPermissions(role);

  const authContext: AdminAuthContext = {
    userId: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email : undefined,
    role,
    permissions: permissionsFromToken,
  };

  const { permissions = [], requireAll = true } = options;
  if (permissions.length === 0) {
    return authContext;
  }

  const hasPermissions = requireAll
    ? permissions.every((perm) => authContext.permissions.includes(perm) || role === 'super_admin')
    : permissions.some((perm) => authContext.permissions.includes(perm) || role === 'super_admin');

  if (!hasPermissions) {
    return forbiddenResponse();
  }

  return authContext;
}

