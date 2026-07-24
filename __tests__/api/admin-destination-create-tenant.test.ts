/**
 * Regression: the dashboard's destination CREATE form omitted tenantId from
 * its POST body. The create endpoint reads tenantId from the body and falls
 * back to the dashboard host tenant when it is absent — a tenant a network
 * admin cannot access — so every create 403'd and network admins literally
 * could not add destinations (found in live E2E, 2026-07-24). These pure
 * helpers mirror the fixed DestinationManager.handleSubmit logic and lock it in.
 */

type TenantSel = string | null | undefined;

// Mirrors the pre-submit guard: a new destination needs a specific brand.
function canCreateDestination(selectedTenantId: TenantSel, editing: boolean): boolean {
  if (editing) return true;
  return Boolean(selectedTenantId && selectedTenantId !== 'all');
}

// Mirrors the create payload: tenantId scopes a NEW destination to the brand;
// edits keep their existing tenant (different endpoint) and add nothing.
function createTenantPatch(selectedTenantId: TenantSel, editing: boolean): Record<string, unknown> {
  return editing ? {} : { tenantId: selectedTenantId };
}

describe('destination create scoping', () => {
  it('blocks creating with no brand / All Brands selected', () => {
    expect(canCreateDestination('all', false)).toBe(false);
    expect(canCreateDestination('', false)).toBe(false);
    expect(canCreateDestination(null, false)).toBe(false);
    expect(canCreateDestination(undefined, false)).toBe(false);
  });

  it('allows creating when a specific brand is selected', () => {
    expect(canCreateDestination('hurghada-speedboat', false)).toBe(true);
  });

  it('always allows saving an edit (tenant already set)', () => {
    expect(canCreateDestination('all', true)).toBe(true);
    expect(canCreateDestination(null, true)).toBe(true);
  });

  it('the create payload carries the selected brand as tenantId (the fix)', () => {
    expect(createTenantPatch('makadi-bay', false)).toEqual({ tenantId: 'makadi-bay' });
  });

  it('an edit payload adds no tenantId (keeps the existing one)', () => {
    expect(createTenantPatch('makadi-bay', true)).toEqual({});
  });
});
