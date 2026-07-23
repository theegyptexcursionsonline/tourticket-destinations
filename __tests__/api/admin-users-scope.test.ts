/**
 * Regression: the admin users list required `super_admin` for the "All Brands"
 * view (no tenantId param — the page's default), so the network admin account
 * (role `admin`, 17 accessible tenants) always saw "Failed to fetch users".
 * All Brands must scope to the admin's own tenant set, like the bookings routes.
 */

import { canViewAllBrandUsers, usersBookingTenantFilter } from '@/lib/admin/userListScope';

const networkAdmin = { role: 'admin', tenantIds: ['makadi-bay', 'dahab-excursions', 'luxor-excursions'] };
const superAdmin = { role: 'super_admin', tenantIds: [] };
const scopelessAdmin = { role: 'admin', tenantIds: [] };

describe('canViewAllBrandUsers', () => {
  it('allows a network admin who has accessible tenants (the regression)', () => {
    expect(canViewAllBrandUsers(networkAdmin)).toBe(true);
  });
  it('allows a super_admin', () => {
    expect(canViewAllBrandUsers(superAdmin)).toBe(true);
  });
  it('forbids an admin with no tenants', () => {
    expect(canViewAllBrandUsers(scopelessAdmin)).toBe(false);
  });
});

describe('usersBookingTenantFilter', () => {
  it('pins to a specific brand when one is selected', () => {
    expect(usersBookingTenantFilter(networkAdmin, 'makadi-bay')).toEqual({ tenantId: 'makadi-bay' });
  });
  it('scopes All Brands to the network admin tenant set', () => {
    expect(usersBookingTenantFilter(networkAdmin, 'all')).toEqual({
      tenantId: { $in: ['makadi-bay', 'dahab-excursions', 'luxor-excursions'] },
    });
    expect(usersBookingTenantFilter(networkAdmin, null)).toEqual({
      tenantId: { $in: ['makadi-bay', 'dahab-excursions', 'luxor-excursions'] },
    });
  });
  it('super_admin All Brands still excludes default-brand (eeo) bookings', () => {
    expect(usersBookingTenantFilter(superAdmin, null)).toEqual({
      tenantId: { $nin: ['default', null] },
    });
  });
  it('never lets a network admin filter include the default brand', () => {
    const filter = usersBookingTenantFilter(networkAdmin, null) as { tenantId: { $in: string[] } };
    expect(filter.tenantId.$in).not.toContain('default');
  });
});
