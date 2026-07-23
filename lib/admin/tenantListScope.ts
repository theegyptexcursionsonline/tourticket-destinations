// Tenant scoping for admin list routes (destinations, discounts, blog,
// stop-sale logs).
//
// Same regression class as the users list (#76): "All Brands" (no tenantId
// param) is these pages' DEFAULT view, and gating it on `super_admin` bricks
// the page for the network admin (role `admin` with an accessible tenant set).
// All Brands must scope to the admin's own tenant set instead; super_admin
// keeps each route's historical All-Brands behavior.

interface ListScopeAuth {
  role: string;
  tenantIds: string[];
}

export function canViewAllBrands(auth: ListScopeAuth): boolean {
  return auth.role === 'super_admin' || auth.tenantIds.length > 0;
}

/**
 * The `tenantId` clause for a list query, or `null` when the query should not
 * be tenant-filtered (super_admin All Brands on routes that historically
 * listed everything). Routes that exclude the default (eeo) brand from the
 * super_admin All-Brands view pass `superAdminAllExcludesDefault`.
 */
export function listTenantClause(
  auth: ListScopeAuth,
  tenantId: string | null | undefined,
  opts: { superAdminAllExcludesDefault?: boolean } = {},
): unknown {
  if (tenantId && tenantId !== 'all') {
    return tenantId;
  }
  if (auth.role === 'super_admin') {
    return opts.superAdminAllExcludesDefault ? { $nin: ['default', null, undefined] } : null;
  }
  // Network admin: only brands in their own tenant set (never includes 'default')
  return { $in: auth.tenantIds };
}
