import type { LoginAuditOutcome } from '@/lib/auth/loginAuditOutcomes';

export interface HeaderReader {
  get(name: string): string | null;
}

const MAX_USER_AGENT_LENGTH = 256;
const MAX_EMAIL_LENGTH = 254;

// Netlify exposes the real client address on x-nf-client-connection-ip;
// x-forwarded-for is the general fallback (first hop = client).
export function extractClientInfo(headers: HeaderReader): { ip: string; userAgent: string } {
  const netlifyIp = headers.get('x-nf-client-connection-ip')?.trim();
  const forwardedIp = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = headers.get('user-agent')?.trim();

  return {
    ip: netlifyIp || forwardedIp || 'unknown',
    userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : 'unknown',
  };
}

export function buildLoginAuditEntry(
  headers: HeaderReader,
  email: string,
  outcome: LoginAuditOutcome,
): { email: string; outcome: LoginAuditOutcome; ip: string; userAgent: string } {
  return {
    email: email.toLowerCase().trim().slice(0, MAX_EMAIL_LENGTH),
    outcome,
    ...extractClientInfo(headers),
  };
}

// Awaited by the login route (a fire-and-forget promise can be frozen with
// the lambda before it commits), but never allowed to fail a login.
export async function recordLoginAudit(
  headers: HeaderReader,
  email: string,
  outcome: LoginAuditOutcome,
): Promise<void> {
  try {
    // Lazy model import keeps mongoose out of this module's import graph so
    // pure helpers stay unit-testable and route tests can mock per-model.
    const { default: AdminLoginAudit } = await import('@/lib/models/AdminLoginAudit');
    await AdminLoginAudit.create(buildLoginAuditEntry(headers, email, outcome));
  } catch (error) {
    console.warn('Failed to record login audit:', error instanceof Error ? error.message : error);
  }
}
