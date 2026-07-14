export function serializeTenantIds(value: unknown): string[] {
  if (value == null || typeof (value as Iterable<unknown>)[Symbol.iterator] !== 'function') {
    return [];
  }

  return Array.from(value as Iterable<unknown>, (tenantId) => String(tenantId));
}

export const ADMIN_PORTAL_SCOPES = ['main', 'multiTenant'] as const;

export type AdminPortalScope = (typeof ADMIN_PORTAL_SCOPES)[number];

export function serializeAdminPortalScopes(value: unknown): AdminPortalScope[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (scope): scope is AdminPortalScope =>
          typeof scope === 'string'
          && ADMIN_PORTAL_SCOPES.includes(scope as AdminPortalScope),
      ),
    ),
  );
}

export function canAccessMultiTenantAdmin(
  role: string,
  tenantIds: string[],
  portalScopes?: unknown,
): boolean {
  if (portalScopes != null) {
    if (!Array.isArray(portalScopes) || (
      portalScopes.length > 0
      && !serializeAdminPortalScopes(portalScopes).includes('multiTenant')
    )) {
      return false;
    }
  }

  return role === 'admin' || role === 'super_admin' || tenantIds.length > 0;
}
