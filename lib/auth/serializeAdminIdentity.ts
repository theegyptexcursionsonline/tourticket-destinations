export function serializeTenantIds(value: unknown): string[] {
  if (value == null || typeof (value as Iterable<unknown>)[Symbol.iterator] !== 'function') {
    return [];
  }

  return Array.from(value as Iterable<unknown>, (tenantId) => String(tenantId));
}
