import {
  canAccessMultiTenantAdmin,
  serializeAdminPortalScopes,
  serializeTenantIds,
} from '../serializeAdminIdentity';

describe('serializeTenantIds', () => {
  it('returns a plain string array for an array-like database value', () => {
    class DatabaseArray extends Array<unknown> {}

    const source = new DatabaseArray('default', 42);
    const result = serializeTenantIds(source);

    expect(result).toEqual(['default', '42']);
    expect(Object.getPrototypeOf(result)).toBe(Array.prototype);
  });

  it('returns an empty array when tenant access is unset', () => {
    expect(serializeTenantIds(undefined)).toEqual([]);
  });
});

describe('canAccessMultiTenantAdmin', () => {
  it('keeps main-site-only operations accounts out of the multi-tenant portal', () => {
    expect(canAccessMultiTenantAdmin('operations', [])).toBe(false);
  });

  it('allows tenant-scoped operators and full administrators', () => {
    expect(canAccessMultiTenantAdmin('operations', ['default'])).toBe(true);
    expect(canAccessMultiTenantAdmin('admin', [])).toBe(true);
    expect(canAccessMultiTenantAdmin('super_admin', [])).toBe(true);
  });

  it('keeps explicitly main-only administrators out of the multi-tenant portal', () => {
    expect(canAccessMultiTenantAdmin('admin', [], ['main'])).toBe(false);
    expect(canAccessMultiTenantAdmin('super_admin', [], ['main'])).toBe(false);
  });

  it('allows explicitly multi-tenant administrators and normalizes their scopes', () => {
    expect(canAccessMultiTenantAdmin('admin', [], ['multiTenant'])).toBe(true);
    expect(serializeAdminPortalScopes(['multiTenant', 'multiTenant', 'invalid']))
      .toEqual(['multiTenant']);
  });

  it('rejects malformed explicit portal scope data', () => {
    expect(canAccessMultiTenantAdmin('admin', [], ['invalid'])).toBe(false);
    expect(canAccessMultiTenantAdmin('admin', [], 'multiTenant')).toBe(false);
  });
});
