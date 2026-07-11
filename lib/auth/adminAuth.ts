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
  tenantIds: string[];
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
  // Admin browser sessions are cookie-only. Never accept a bearer token here:
  // doing so encourages exposing the credential to JavaScript/localStorage.
  const token = request.cookies.get('admin-auth-token')?.value || '';

  if (!token) {
    return unauthorizedResponse();
  }

  const payload = await verifyToken(token);
  if (!payload || payload.scope !== 'admin') {
    return unauthorizedResponse();
  }

  // JWT claims are only a session pointer. Re-read mutable authorization state
  // so disabling/demoting an admin takes effect immediately instead of waiting
  // for the eight-hour cookie to expire.
  const [{ default: dbConnect }, { default: User }] = await Promise.all([
    import('@/lib/dbConnect'),
    import('@/lib/models/user'),
  ]);
  await dbConnect();
  const user = await User.findById(String(payload.sub))
    .select('email role permissions tenantIds isActive')
    .lean<any>();
  if (!user || !user.isActive || !user.role || user.role === 'customer') {
    return unauthorizedResponse();
  }

  const role = user.role as AdminRole;
  const permissionsFromToken = Array.isArray(user.permissions) && user.permissions.length > 0
    ? (user.permissions as AdminPermission[])
    : getDefaultPermissions(role);

  const authContext: AdminAuthContext = {
    userId: String(payload.sub),
    email: typeof user.email === 'string' ? user.email : undefined,
    role,
    permissions: permissionsFromToken,
    tenantIds: Array.isArray(user.tenantIds)
      ? user.tenantIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : [],
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

export function canAccessTenant(auth: AdminAuthContext, tenantId: string): boolean {
  return auth.role === 'super_admin' || auth.tenantIds.includes(tenantId);
}

export function tenantForbiddenResponse() {
  return NextResponse.json(
    { success: false, error: 'You do not have access to this tenant.' },
    { status: 403 },
  );
}
