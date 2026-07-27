import {
  applyPendingAdminGrant,
  clearPendingAdminGrant,
  effectivePortalScopes,
  grantPortalScope,
  hasPortalMembership,
  revokePortalScope,
} from '@/lib/admin/teamMembership';

describe('effectivePortalScopes', () => {
  it('treats a legacy account with no scopes as holding every scope', () => {
    expect(effectivePortalScopes({ role: 'admin' })).toEqual(['main', 'multiTenant']);
    expect(effectivePortalScopes({ role: 'admin', adminPortalScopes: [] })).toEqual(['main', 'multiTenant']);
  });

  it('does not treat a customer with no scopes as an administrator', () => {
    expect(effectivePortalScopes({ role: 'customer' })).toEqual([]);
    expect(hasPortalMembership({ role: 'customer' }, 'main')).toBe(false);
  });

  it('uses the declared scopes once an account has been migrated', () => {
    expect(effectivePortalScopes({ adminPortalScopes: ['main'] })).toEqual(['main']);
  });
});

describe('grantPortalScope', () => {
  it('does not revoke a legacy admin\'s main access when adding them to the network', () => {
    // Writing ['multiTenant'] here would end the grandfathering that keeps a
    // legacy admin signed in to the main portal, locking them out.
    expect(grantPortalScope({ role: 'admin', tenantIds: ['makadi-bay'] }, 'multiTenant'))
      .toEqual(expect.arrayContaining(['main', 'multiTenant']));
  });

  it('does not hand main-portal access to a network-only admin', () => {
    expect(grantPortalScope({ adminPortalScopes: ['multiTenant'] }, 'multiTenant'))
      .toEqual(['multiTenant']);
  });

  it('adds the requested scope to an explicitly scoped account', () => {
    expect(grantPortalScope({ adminPortalScopes: ['main'] }, 'multiTenant'))
      .toEqual(['main', 'multiTenant']);
  });
});

describe('revokePortalScope', () => {
  it('reverts a main-only admin to a customer instead of deleting them', () => {
    expect(revokePortalScope({ adminPortalScopes: ['main'] }, 'main'))
      .toEqual({ outcome: 'reverted_to_customer' });
  });

  it('leaves network access untouched when main access is removed', () => {
    expect(revokePortalScope(
      { adminPortalScopes: ['main', 'multiTenant'], tenantIds: ['makadi-bay'] },
      'main',
    )).toEqual({
      outcome: 'scope_removed',
      adminPortalScopes: ['multiTenant'],
      tenantIds: ['makadi-bay'],
    });
  });

  it('leaves main access untouched when only some brands are removed', () => {
    expect(revokePortalScope(
      { adminPortalScopes: ['main', 'multiTenant'], tenantIds: ['makadi-bay', 'el-gouna'] },
      'multiTenant',
      { removeTenantIds: ['makadi-bay'] },
    )).toEqual({
      outcome: 'scope_removed',
      adminPortalScopes: ['main', 'multiTenant'],
      tenantIds: ['el-gouna'],
    });
  });

  it('drops the network scope once the last brand is removed', () => {
    expect(revokePortalScope(
      { adminPortalScopes: ['main', 'multiTenant'], tenantIds: ['makadi-bay'] },
      'multiTenant',
      { removeTenantIds: ['makadi-bay'] },
    )).toEqual({
      outcome: 'scope_removed',
      adminPortalScopes: ['main'],
      tenantIds: [],
    });
  });

  it('reverts a legacy normal admin with no brands when their main access is removed', () => {
    expect(revokePortalScope({ role: 'admin' }, 'main')).toEqual({ outcome: 'reverted_to_customer' });
  });

  it('keeps a legacy admin who still manages brands', () => {
    expect(revokePortalScope({ role: 'admin', tenantIds: ['makadi-bay'] }, 'main'))
      .toEqual({
        outcome: 'scope_removed',
        adminPortalScopes: ['multiTenant'],
        tenantIds: ['makadi-bay'],
      });
  });

  it('keeps global network access when main is removed from a super-admin', () => {
    expect(revokePortalScope({ role: 'super_admin' }, 'main')).toEqual({
      outcome: 'scope_removed',
      adminPortalScopes: ['multiTenant'],
      tenantIds: [],
    });
  });
});

describe('applyPendingAdminGrant', () => {
  it('returns null when there is nothing pending', () => {
    expect(applyPendingAdminGrant({ role: 'customer' } as never)).toBeNull();
  });

  it('grants the offered role, permissions and scope on acceptance', () => {
    expect(applyPendingAdminGrant({
      role: 'customer',
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['main'],
    })).toEqual({
      role: 'operations',
      permissions: ['manageTours'],
      adminPortalScopes: ['main'],
    });
  });

  it('merges the offered scope with scopes the account already holds', () => {
    expect(applyPendingAdminGrant({
      role: 'operations',
      permissions: ['manageBookings'],
      adminPortalScopes: ['multiTenant'],
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['main'],
    })).toEqual(expect.objectContaining({
      role: 'operations',
      permissions: ['manageBookings', 'manageTours'],
      adminPortalScopes: ['multiTenant', 'main'],
    }));
  });

  it('never demotes an existing administrator when another portal is accepted', () => {
    expect(applyPendingAdminGrant({
      role: 'admin',
      permissions: ['manageUsers'],
      adminPortalScopes: ['multiTenant'],
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['main'],
    })).toEqual(expect.objectContaining({
      role: 'admin',
      permissions: ['manageUsers', 'manageTours'],
    }));
  });

  it('merges brand assignments without dropping existing ones', () => {
    expect(applyPendingAdminGrant({
      role: 'customer',
      tenantIds: ['el-gouna'],
      pendingAdminRole: 'operations',
      pendingAdminPermissions: [],
      pendingAdminTenantIds: ['makadi-bay'],
    })!.tenantIds).toEqual(['el-gouna', 'makadi-bay']);
  });
});

describe('clearPendingAdminGrant', () => {
  it('clears every pending field so a withdrawn invite leaves no trace', () => {
    expect(clearPendingAdminGrant(1)).toEqual({
      pendingAdminRole: 1,
      pendingAdminPermissions: 1,
      pendingAdminScopes: 1,
      pendingAdminInvitedAt: 1,
      pendingAdminInvitedBy: 1,
    });
  });
});
