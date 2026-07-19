// Pure RBAC guards for team-member mutations (deactivate / demote / delete).
// Kept side-effect-free so the rules are unit-testable without a database; the
// route supplies the live super-admin count.

export type TeamMutationAction = 'delete' | 'deactivate' | 'demote';

export type TeamMutationGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export interface TeamMutationGuardInput {
  actorUserId: string;
  targetUserId: string;
  targetRole: string;
  targetIsActive: boolean;
  action: TeamMutationAction;
  /** Count of OTHER active super_admins (excluding the target). */
  otherActiveSuperAdmins: number;
}

/**
 * Blocks two classes of invalid team-mutation:
 *  1. Self-lockout — an admin deleting or deactivating their own account.
 *  2. Removing the last active super administrator (by delete, deactivate, or
 *     demotion), which would strip everyone of super-admin-only powers
 *     (granting manageTenants, all-brands user access, team cleanup).
 */
export function guardTeamMutation(input: TeamMutationGuardInput): TeamMutationGuardResult {
  const isSelf = input.actorUserId === input.targetUserId;

  if (isSelf && input.action === 'delete') {
    return { ok: false, status: 409, error: 'You cannot delete your own account.' };
  }
  if (isSelf && input.action === 'deactivate') {
    return { ok: false, status: 409, error: 'You cannot deactivate your own account.' };
  }

  const removesActiveSuperAdmin =
    input.targetRole === 'super_admin' && input.targetIsActive;
  if (removesActiveSuperAdmin && input.otherActiveSuperAdmins === 0) {
    return {
      ok: false,
      status: 409,
      error: 'Cannot remove the last active super administrator.',
    };
  }

  return { ok: true };
}
