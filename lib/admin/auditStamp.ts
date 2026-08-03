export interface AuditActor {
  id?: string;
  name?: string;
  email?: string;
}

interface AdminLike {
  id?: string;
  email?: string;
  name?: string;
}

/**
 * Who last touched a record. Stored as a snapshot so the history survives a
 * team member being removed, and never overwritten with an empty actor.
 */
export function auditStamp(admin: AdminLike | null | undefined): AuditActor | undefined {
  if (!admin?.id) return undefined;
  return {
    id: String(admin.id),
    name: admin.name?.trim() || admin.email?.trim() || 'Admin',
    email: admin.email?.trim() || '',
  };
}
