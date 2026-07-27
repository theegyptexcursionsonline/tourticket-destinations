import type { AdminPermission, AdminRole } from '@/lib/constants/adminPermissions';
import {
  type AdminPortalScope,
  serializeAdminPortalScopes,
} from '@/lib/auth/serializeAdminIdentity';

export const PENDING_ADMIN_FIELDS = [
  'pendingAdminRole',
  'pendingAdminPermissions',
  'pendingAdminScopes',
  'pendingAdminInvitedAt',
  'pendingAdminInvitedBy',
] as const;

/** `$unset` payload that clears every pending-grant field in one write. */
export const clearPendingAdminGrant = <T>(value: T) =>
  Object.fromEntries(PENDING_ADMIN_FIELDS.map((field) => [field, value]));

type ScopedAccount = {
  adminPortalScopes?: unknown;
  tenantIds?: unknown;
  role?: unknown;
  isSuperAdmin?: unknown;
};

const isAdminRole = (role: unknown): role is AdminRole =>
  typeof role === 'string' && role !== 'customer';

const hasGlobalNetworkAccess = (account: ScopedAccount) =>
  account.role === 'super_admin' || account.isSuperAdmin === true;

/**
 * Accounts created before portal scopes existed carry no `adminPortalScopes`.
 * Both portal gates read that absence as "allowed everywhere", so an empty or
 * missing value means the account effectively holds every scope. Materialising
 * it has to preserve that, otherwise simply touching a legacy admin silently
 * locks them out of the portal they have been using.
 */
export function effectivePortalScopes(account: ScopedAccount): AdminPortalScope[] {
  const declared = serializeAdminPortalScopes(account.adminPortalScopes);
  if (!Array.isArray(account.adminPortalScopes) || declared.length === 0) {
    return isAdminRole(account.role) ? ['main', 'multiTenant'] : [];
  }
  return declared;
}

export function hasPortalMembership(
  account: ScopedAccount,
  scope: AdminPortalScope,
): boolean {
  return effectivePortalScopes(account).includes(scope);
}

/**
 * Scopes to write when granting `scope` to an existing account. Never widens
 * access beyond what the account already had implicitly, and never narrows it.
 */
export function grantPortalScope(
  account: ScopedAccount,
  scope: AdminPortalScope,
): AdminPortalScope[] {
  return Array.from(new Set([...effectivePortalScopes(account), scope]));
}

export type MembershipRevocation =
  | {
      outcome: 'scope_removed';
      adminPortalScopes: AdminPortalScope[];
      tenantIds: string[];
    }
  | { outcome: 'reverted_to_customer' };

/**
 * Removing someone from one team must not touch the other portal, and must
 * never destroy the underlying person — their bookings, profile and storefront
 * sign-in outlive any admin role. The account only drops back to `customer`
 * once no admin scope is left anywhere.
 */
export function revokePortalScope(
  account: ScopedAccount,
  scope: AdminPortalScope,
  options: { removeTenantIds?: string[] } = {},
): MembershipRevocation {
  const currentTenantIds = Array.isArray(account.tenantIds)
    ? (account.tenantIds as unknown[]).map((tenantId) => String(tenantId))
    : [];
  // Only an explicit brand removal touches brand assignments. Removing main
  // portal access must leave the network side exactly as it was.
  const removeTenantIds = options.removeTenantIds;
  const remainingTenantIds = removeTenantIds
    ? currentTenantIds.filter((tenantId) => !removeTenantIds.includes(tenantId))
    : currentTenantIds;

  // A `multiTenant` scope with no brands behind it grants nothing, so it must
  // not keep an otherwise-removed account alive as an administrator. Removing
  // one brand from someone who manages several leaves the scope in place.
  const survivingScopes = effectivePortalScopes(account).filter((value) => {
    if (value === scope) {
      return value === 'multiTenant'
        && Boolean(removeTenantIds)
        && (remainingTenantIds.length > 0 || hasGlobalNetworkAccess(account));
    }
    if (value === 'multiTenant') {
      return remainingTenantIds.length > 0 || hasGlobalNetworkAccess(account);
    }
    return true;
  });

  if (survivingScopes.length === 0) {
    return { outcome: 'reverted_to_customer' };
  }

  return {
    outcome: 'scope_removed',
    adminPortalScopes: survivingScopes,
    tenantIds: remainingTenantIds,
  };
}

export type PendingAdminGrant = {
  role?: AdminRole;
  permissions?: AdminPermission[];
  pendingAdminRole?: AdminRole;
  pendingAdminPermissions?: AdminPermission[];
  pendingAdminScopes?: AdminPortalScope[];
  pendingAdminTenantIds?: string[];
};

export type AppliedAdminGrant = {
  role: AdminRole;
  permissions: AdminPermission[];
  adminPortalScopes: AdminPortalScope[];
  tenantIds?: string[];
};

/**
 * Turns an accepted invitation into real access. Returns null when the account
 * has no pending grant, so accepting a plain password-reset invitation stays
 * unchanged.
 */
export function applyPendingAdminGrant(
  account: PendingAdminGrant & ScopedAccount,
): AppliedAdminGrant | null {
  if (!account.pendingAdminRole) {
    return null;
  }

  const currentRole = isAdminRole(account.role) ? account.role : null;
  const rolePriority: Record<AdminRole, number> = {
    customer: 0,
    operations: 1,
    content: 1,
    support: 1,
    admin: 2,
    super_admin: 3,
  };
  const role = currentRole
    && rolePriority[currentRole] >= rolePriority[account.pendingAdminRole]
    ? currentRole
    : account.pendingAdminRole;
  const existingPermissions = currentRole && Array.isArray(account.permissions)
    ? account.permissions
    : [];
  const existingScopes = currentRole
    ? effectivePortalScopes(account)
    : serializeAdminPortalScopes(account.adminPortalScopes);

  const granted: AppliedAdminGrant = {
    role,
    permissions: Array.from(
      new Set([
        ...existingPermissions,
        ...(account.pendingAdminPermissions || []),
      ]),
    ),
    adminPortalScopes: Array.from(
      new Set([
        ...existingScopes,
        ...serializeAdminPortalScopes(account.pendingAdminScopes),
      ]),
    ),
  };

  if (Array.isArray(account.pendingAdminTenantIds)) {
    const existing = Array.isArray(account.tenantIds)
      ? (account.tenantIds as unknown[]).map((tenantId) => String(tenantId))
      : [];
    granted.tenantIds = Array.from(
      new Set([...existing, ...account.pendingAdminTenantIds.map(String)]),
    );
  }

  return granted;
}
