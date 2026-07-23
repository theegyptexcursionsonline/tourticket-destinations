// Tenant scoping for the admin customer-user list.
//
// Regression: a network admin (role `admin` with an accessible tenant set)
// viewing "All Brands" sent no tenantId, and the users route required
// `super_admin` for the no-tenant case — 403'ing the page's default view with
// "Failed to fetch users". All Brands must instead scope to the admin's own
// tenant set, exactly like the bookings routes.

interface UserListAuth {
  role: string;
  tenantIds: string[];
}

export function canViewAllBrandUsers(auth: UserListAuth): boolean {
  return auth.role === 'super_admin' || auth.tenantIds.length > 0;
}

export function usersBookingTenantFilter(
  auth: UserListAuth,
  tenantId?: string | null,
): Record<string, unknown> {
  if (tenantId && tenantId !== 'all') {
    return { tenantId };
  }
  if (auth.role === 'super_admin') {
    // "All brands" — exclude default (eeo) bookings
    return { tenantId: { $nin: ['default', null] } };
  }
  // Network admin: only brands in their own tenant set (never includes 'default')
  return { tenantId: { $in: auth.tenantIds } };
}
