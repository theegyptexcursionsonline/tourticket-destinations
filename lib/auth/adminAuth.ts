import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import {
  AdminPermission,
  AdminRole,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';
import { canAccessMultiTenantAdmin } from '@/lib/auth/serializeAdminIdentity';
import { resolveAdminNetworkTenantIds } from '@/lib/auth/adminNetworkScope';
import { ADMIN_ENROLLMENT_SCOPE, ADMIN_SESSION_SCOPE } from '@/lib/auth/adminSession';

export interface AdminAuthContext {
  userId: string;
  email?: string;
  name?: string;
  role: AdminRole;
  permissions: AdminPermission[];
  tenantIds: string[];
  twoFactorEnabled: boolean;
  twoFactorRecoveryPending?: boolean;
}

interface RequireAdminOptions {
  permissions?: AdminPermission[];
  requireAll?: boolean;
  allowTwoFactorEnrollment?: boolean;
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

function twoFactorSetupRequiredResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'Two-factor authentication setup is required before using the admin portal.',
      code: 'TWO_FACTOR_SETUP_REQUIRED',
    },
    { status: 403 },
  );
}

function recoveryAcknowledgementRequiredResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'Save and confirm your recovery codes before using the admin portal.',
      code: 'TWO_FACTOR_RECOVERY_ACK_REQUIRED',
    },
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
  const scope = payload?.scope;
  const enrollmentSession = scope === ADMIN_ENROLLMENT_SCOPE;
  if (!payload || (scope !== ADMIN_SESSION_SCOPE && !enrollmentSession)) {
    return unauthorizedResponse();
  }

  // The explicit development-only admin is a synthetic session identity, not
  // a MongoDB record. Keep production closed while allowing local QA to use
  // the same protected admin routes exercised by real administrators.
  if (
    process.env.NODE_ENV !== 'production'
    && process.env.ALLOW_ENV_ADMIN === 'true'
    && payload.sub === 'env-admin'
    && scope === ADMIN_SESSION_SCOPE
  ) {
    const authContext: AdminAuthContext = {
      userId: 'env-admin',
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: 'super_admin',
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions as AdminPermission[]
        : getDefaultPermissions('super_admin'),
      tenantIds: resolveAdminNetworkTenantIds('super_admin', payload.tenantIds),
      twoFactorEnabled: true,
      twoFactorRecoveryPending: false,
    };
    const { registerAdminAuditActor } = await import('@/lib/admin/adminAudit');
    registerAdminAuditActor(authContext);

    const { permissions = [], requireAll = true } = options;
    const hasPermissions = permissions.length === 0 || (requireAll
      ? permissions.every((permission) => authContext.permissions.includes(permission))
      : permissions.some((permission) => authContext.permissions.includes(permission)));
    if (!hasPermissions) return forbiddenResponse();
    return authContext;
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
    .select('email firstName lastName role permissions tenantIds adminPortalScopes isActive twoFactorEnabled twoFactorRecoveryPending')
    .lean<any>();
  if (!user || !user.isActive || !user.role || user.role === 'customer') {
    return unauthorizedResponse();
  }

  const role = user.role as AdminRole;
  const permissionsFromToken = role === 'admin' || role === 'super_admin'
    ? getDefaultPermissions(role)
    : Array.isArray(user.permissions) && user.permissions.length > 0
      ? (user.permissions as AdminPermission[])
      : getDefaultPermissions(role);
  const tenantIds = resolveAdminNetworkTenantIds(role, user.tenantIds);

  if (!canAccessMultiTenantAdmin(role, tenantIds, user.adminPortalScopes)) {
    return forbiddenResponse();
  }

  const recoveryPending = Boolean(user.twoFactorRecoveryPending);
  if (enrollmentSession && user.twoFactorEnabled && !recoveryPending) {
    return unauthorizedResponse();
  }
  if (!user.twoFactorEnabled && !options.allowTwoFactorEnrollment) {
    return twoFactorSetupRequiredResponse();
  }
  if (recoveryPending && !options.allowTwoFactorEnrollment) {
    return recoveryAcknowledgementRequiredResponse();
  }

  const enrollmentBoundary = enrollmentSession
    || !user.twoFactorEnabled
    || recoveryPending;

  const authContext: AdminAuthContext = {
    userId: String(payload.sub),
    email: typeof user.email === 'string' ? user.email : undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined,
    role,
    // An older full-session cookie may predate mandatory 2FA. Keep even the
    // profile response least-privileged until setup is fully acknowledged.
    permissions: enrollmentBoundary ? [] : permissionsFromToken,
    tenantIds: enrollmentBoundary ? [] : tenantIds,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    twoFactorRecoveryPending: recoveryPending,
  };

  // The route wrapper writes after the handler finishes so completed,
  // rejected, and failed actions remain distinguishable. Actor tenantIds are
  // the authoritative English-network scope; never widen to a default brand.
  const { registerAdminAuditActor } = await import('@/lib/admin/adminAudit');
  // Enrollment sessions intentionally return no tenant authority to the route,
  // but their 2FA mutations still need to be visible in every tenant the actor
  // is actually assigned to. Register the verified database scope for audit
  // attribution without widening the authorization context returned below.
  registerAdminAuditActor({ ...authContext, tenantIds });

  const requestedTenantId = request.nextUrl.searchParams.get('tenantId')
    || request.nextUrl.searchParams.get('brandId')
    || request.nextUrl.searchParams.get('brand_id');
  if (
    requestedTenantId
    && requestedTenantId !== 'all'
    && !authContext.tenantIds.includes(requestedTenantId)
  ) {
    return forbiddenResponse();
  }

  const { permissions = [], requireAll = true } = options;
  const hasPermissions = permissions.length === 0 || (requireAll
    ? permissions.every((perm) => authContext.permissions.includes(perm) || role === 'super_admin')
    : permissions.some((perm) => authContext.permissions.includes(perm) || role === 'super_admin'));

  if (!hasPermissions) {
    return forbiddenResponse();
  }

  return authContext;
}

export function canAccessTenant(auth: AdminAuthContext, tenantId: string): boolean {
  return auth.tenantIds.includes(tenantId);
}

export function tenantForbiddenResponse() {
  return NextResponse.json(
    { success: false, error: 'You do not have access to this tenant.' },
    { status: 403 },
  );
}
