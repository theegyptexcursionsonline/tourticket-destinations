// Pure constants module — safe to import from tests and client-free code
// without dragging mongoose into the bundle.
export const LOGIN_AUDIT_OUTCOMES = [
  'success',
  'unknown_account',
  'wrong_password',
  'locked',
  'rate_limited',
  'inactive',
  'not_admin',
  'portal_rejected',
  'two_factor_required',
  'wrong_second_factor',
  'two_factor_reset',
  'error',
] as const;

export type LoginAuditOutcome = (typeof LOGIN_AUDIT_OUTCOMES)[number];
