import { guardTeamMutation } from '@/lib/auth/teamMutationGuards';

const base = {
  actorUserId: 'actor-1',
  targetUserId: 'target-2',
  targetRole: 'operations',
  targetIsActive: true,
  otherActiveSuperAdmins: 5,
} as const;

describe('guardTeamMutation', () => {
  it('blocks deleting your own account', () => {
    const r = guardTeamMutation({ ...base, targetUserId: 'actor-1', action: 'delete' });
    expect(r).toEqual({ ok: false, status: 409, error: 'You cannot delete your own account.' });
  });

  it('blocks deactivating your own account', () => {
    const r = guardTeamMutation({ ...base, targetUserId: 'actor-1', action: 'deactivate' });
    expect(r).toEqual({ ok: false, status: 409, error: 'You cannot deactivate your own account.' });
  });

  it('blocks deleting the last active super administrator', () => {
    const r = guardTeamMutation({ ...base, targetRole: 'super_admin', action: 'delete', otherActiveSuperAdmins: 0 });
    expect(r).toEqual({ ok: false, status: 409, error: 'Cannot remove the last active super administrator.' });
  });

  it('blocks deactivating the last active super administrator', () => {
    const r = guardTeamMutation({ ...base, targetRole: 'super_admin', action: 'deactivate', otherActiveSuperAdmins: 0 });
    expect(r.ok).toBe(false);
  });

  it('blocks demoting the last active super administrator', () => {
    const r = guardTeamMutation({ ...base, targetRole: 'super_admin', action: 'demote', otherActiveSuperAdmins: 0 });
    expect(r.ok).toBe(false);
  });

  it('allows removing a super administrator when others remain', () => {
    const r = guardTeamMutation({ ...base, targetRole: 'super_admin', action: 'delete', otherActiveSuperAdmins: 1 });
    expect(r).toEqual({ ok: true });
  });

  it('ignores the super-admin count for an inactive super admin (already not counted)', () => {
    const r = guardTeamMutation({ ...base, targetRole: 'super_admin', targetIsActive: false, action: 'delete', otherActiveSuperAdmins: 0 });
    expect(r).toEqual({ ok: true });
  });

  it('allows deleting another non-super team member', () => {
    expect(guardTeamMutation({ ...base, action: 'delete' })).toEqual({ ok: true });
  });

  it('allows deactivating another team member', () => {
    expect(guardTeamMutation({ ...base, action: 'deactivate' })).toEqual({ ok: true });
  });
});
