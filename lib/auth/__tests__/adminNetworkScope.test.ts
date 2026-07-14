import {
  ADMIN_NETWORK_TENANT_IDS,
  isAdminNetworkTenantId,
  resolveAdminNetworkTenantIds,
} from '../adminNetworkScope';

describe('combined English and German admin network scope', () => {
  it('contains all destination brands but not the separate main EEO tenant', () => {
    expect(ADMIN_NETWORK_TENANT_IDS).toHaveLength(17);
    expect(isAdminNetworkTenantId('hurghada-speedboat')).toBe(true);
    expect(isAdminNetworkTenantId('sharm-ausfluege')).toBe(true);
    expect(isAdminNetworkTenantId('default')).toBe(false);
  });

  it('intersects assigned tenants with the combined network', () => {
    expect(resolveAdminNetworkTenantIds('admin', [
      'hurghada-speedboat',
      'sharm-ausfluege',
      'hurghada-speedboat',
    ])).toEqual(['hurghada-speedboat', 'sharm-ausfluege']);
  });

  it('gives super administrators the combined network, not the shared main catalogue', () => {
    expect(resolveAdminNetworkTenantIds('super_admin', [])).toEqual(ADMIN_NETWORK_TENANT_IDS);
  });
});
