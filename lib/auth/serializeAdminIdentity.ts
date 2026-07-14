export function serializeTenantIds(value: unknown): string[] {
  if (value == null || typeof (value as Iterable<unknown>)[Symbol.iterator] !== 'function') {
    return [];
  }

  return Array.from(value as Iterable<unknown>, (tenantId) => String(tenantId));
}

export function canAccessMultiTenantAdmin(role: string, tenantIds: string[]): boolean {
  return role === 'admin' || role === 'super_admin' || tenantIds.length > 0;
}
