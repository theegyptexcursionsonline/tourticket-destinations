/**
 * Regression (parity of #76): destinations / discounts / blog / stop-sale-logs
 * admin list routes required `super_admin` for the "All Brands" view (no
 * tenantId param — every page's default), so the network admin account (role
 * `admin`, 17 accessible tenants) got a 403 on each page's first load. All
 * Brands must scope to the admin's own tenant set, like the bookings and
 * users routes.
 */

import { canViewAllBrands, listTenantClause } from '@/lib/admin/tenantListScope';

const networkAdmin = { role: 'admin', tenantIds: ['makadi-bay', 'dahab-excursions', 'luxor-excursions'] };
const superAdmin = { role: 'super_admin', tenantIds: [] };
const scopelessAdmin = { role: 'admin', tenantIds: [] };

describe('canViewAllBrands', () => {
  it('allows a network admin who has accessible tenants (the regression)', () => {
    expect(canViewAllBrands(networkAdmin)).toBe(true);
  });
  it('allows a super_admin', () => {
    expect(canViewAllBrands(superAdmin)).toBe(true);
  });
  it('forbids an admin with no tenants', () => {
    expect(canViewAllBrands(scopelessAdmin)).toBe(false);
  });
});

describe('listTenantClause', () => {
  it('pins to a specific brand when one is selected', () => {
    expect(listTenantClause(networkAdmin, 'makadi-bay')).toBe('makadi-bay');
    expect(listTenantClause(superAdmin, 'makadi-bay')).toBe('makadi-bay');
  });
  it('scopes All Brands to the network admin tenant set', () => {
    expect(listTenantClause(networkAdmin, 'all')).toEqual({
      $in: ['makadi-bay', 'dahab-excursions', 'luxor-excursions'],
    });
    expect(listTenantClause(networkAdmin, null)).toEqual({
      $in: ['makadi-bay', 'dahab-excursions', 'luxor-excursions'],
    });
  });
  it('keeps super_admin All Brands unfiltered on routes that list everything', () => {
    expect(listTenantClause(superAdmin, null)).toBeNull();
    expect(listTenantClause(superAdmin, 'all')).toBeNull();
  });
  it('super_admin All Brands excludes the default brand where the route always did', () => {
    expect(listTenantClause(superAdmin, null, { superAdminAllExcludesDefault: true })).toEqual({
      $nin: ['default', null, undefined],
    });
  });
  it('never lets a network admin clause include the default brand', () => {
    const clause = listTenantClause(networkAdmin, null) as { $in: string[] };
    expect(clause.$in).not.toContain('default');
    const explicit = listTenantClause(networkAdmin, null, { superAdminAllExcludesDefault: true }) as { $in: string[] };
    expect(explicit.$in).not.toContain('default');
  });
});
