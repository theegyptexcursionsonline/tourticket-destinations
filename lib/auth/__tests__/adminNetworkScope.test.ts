import {
  ADMIN_NETWORK_TENANT_IDS,
  isAdminNetworkTenantId,
  resolveAdminNetworkTenantIds,
} from '../adminNetworkScope';

describe('English admin network scope', () => {
  it('contains only the English destination brands', () => {
    expect(ADMIN_NETWORK_TENANT_IDS).toHaveLength(10);
    expect(isAdminNetworkTenantId('hurghada-speedboat')).toBe(true);
    expect(isAdminNetworkTenantId('sharm-ausfluege')).toBe(false);
    expect(isAdminNetworkTenantId('default')).toBe(false);
  });

  it('intersects assigned tenants with the English network', () => {
    expect(resolveAdminNetworkTenantIds('admin', [
      'hurghada-speedboat',
      'sharm-ausfluege',
      'hurghada-speedboat',
    ])).toEqual(['hurghada-speedboat']);
  });

  it('gives super administrators the English network, not the shared database', () => {
    expect(resolveAdminNetworkTenantIds('super_admin', [])).toEqual(ADMIN_NETWORK_TENANT_IDS);
  });
});
