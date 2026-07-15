/**
 * Unit test: single-booking tenant scoping for the [id] route.
 *
 * Regression: a network admin (role `admin` with an accessible tenant set)
 * viewing "All Brands" sent no tenantId, and the GET/PATCH/DELETE handlers
 * required `super_admin` for the no-tenant case — 403'ing every status change
 * with "Failed to update booking status". These pure helpers mirror the
 * handler logic and lock in the fix.
 */

type Role = 'admin' | 'super_admin' | 'operations';
interface Auth { role: Role; tenantIds: string[] }

function canActOnAllBrands(auth: Auth): boolean {
  return auth.role === 'super_admin' || auth.tenantIds.length > 0;
}

function bookingTenantFilter(auth: Auth, id: string, effectiveTenantId?: string): Record<string, unknown> {
  if (effectiveTenantId) return { _id: id, tenantId: effectiveTenantId };
  if (auth.role === 'super_admin') return { _id: id };
  return { _id: id, tenantId: { $in: auth.tenantIds } };
}

function bookingMatchesTenantScope(booking: any, auth: Auth, effectiveTenantId?: string): boolean {
  if (!effectiveTenantId) {
    if (auth.role === 'super_admin') return true;
    return auth.tenantIds.includes(booking?.tenantId);
  }
  if (booking?.tenantId !== effectiveTenantId) return false;
  const tourTenantId = booking?.tour?.tenantId;
  const tourTenantIds = Array.isArray(booking?.tour?.tenantIds) ? booking.tour.tenantIds : [];
  return tourTenantId === effectiveTenantId || tourTenantIds.includes(effectiveTenantId);
}

const networkAdmin: Auth = { role: 'admin', tenantIds: ['makadi-bay', 'dahab-excursions', 'luxor-excursions'] };
const superAdmin: Auth = { role: 'super_admin', tenantIds: [] };
const scopelessAdmin: Auth = { role: 'admin', tenantIds: [] };

describe('canActOnAllBrands', () => {
  it('allows a network admin who has accessible tenants (the regression)', () => {
    expect(canActOnAllBrands(networkAdmin)).toBe(true);
  });
  it('allows a super_admin', () => {
    expect(canActOnAllBrands(superAdmin)).toBe(true);
  });
  it('forbids an admin with no tenants', () => {
    expect(canActOnAllBrands(scopelessAdmin)).toBe(false);
  });
});

describe('bookingTenantFilter', () => {
  it('scopes All Brands to the network admin tenant set', () => {
    expect(bookingTenantFilter(networkAdmin, 'b1')).toEqual({
      _id: 'b1',
      tenantId: { $in: ['makadi-bay', 'dahab-excursions', 'luxor-excursions'] },
    });
  });
  it('lets a super_admin touch any booking on All Brands', () => {
    expect(bookingTenantFilter(superAdmin, 'b1')).toEqual({ _id: 'b1' });
  });
  it('pins to a specific brand when one is selected', () => {
    expect(bookingTenantFilter(networkAdmin, 'b1', 'makadi-bay')).toEqual({ _id: 'b1', tenantId: 'makadi-bay' });
  });
});

describe('bookingMatchesTenantScope (All Brands)', () => {
  it('accepts a booking whose brand is in the admin set', () => {
    expect(bookingMatchesTenantScope({ tenantId: 'dahab-excursions' }, networkAdmin)).toBe(true);
  });
  it('rejects a booking from a brand the admin cannot access', () => {
    expect(bookingMatchesTenantScope({ tenantId: 'cairo-excursions' }, networkAdmin)).toBe(false);
  });
  it('super_admin matches any booking', () => {
    expect(bookingMatchesTenantScope({ tenantId: 'anything' }, superAdmin)).toBe(true);
  });
});
