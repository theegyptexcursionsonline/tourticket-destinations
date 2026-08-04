import type { NextRequest } from 'next/server';
import type { AdminPermission, AdminRole } from '@/lib/constants/adminPermissions';
import type { AdminAuditAction } from '@/lib/models/AdminMutationAudit';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SELF_AUDITED_PATHS = [/^\/api\/admin\/team\/[^/]+\/permanent$/];
const EXECUTE_HINTS = new Set([
  'activate', 'approve', 'archive', 'assign', 'bulk', 'cancel', 'cleanup',
  'publish', 'refund', 'resend', 'restore', 'revoke', 'sync', 'translate', 'upload',
]);

export interface AuditAuthContext {
  userId: string;
  email?: string;
  name?: string;
  role: AdminRole;
  permissions: AdminPermission[];
  tenantIds?: string[];
}

export interface AdminAuditDescriptor {
  action: AdminAuditAction;
  resourceType: string;
  resourceId?: string;
  summary: string;
}

const titleCase = (value: string) => value
  .split(/[-_]/g)
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const isIdentifier = (value: string) => /^[a-f\d]{24}$/i.test(value)
  || /^[a-z0-9][a-z0-9-]{5,}$/i.test(value);

export function describeAdminMutation(method: string, pathname: string): AdminAuditDescriptor {
  const segments = pathname.split('/').filter(Boolean);
  const adminIndex = segments.findIndex((segment) => segment === 'admin');
  const routeSegments = (adminIndex >= 0 ? segments.slice(adminIndex + 1) : segments.slice(1))
    .filter((segment) => segment !== 'api');
  const resourceType = routeSegments[0] || 'administration';
  const lastSegment = routeSegments.at(-1);
  const resourceId = lastSegment && lastSegment !== resourceType && isIdentifier(lastSegment)
    ? lastSegment
    : undefined;
  const hasExecuteHint = routeSegments.some((segment) => EXECUTE_HINTS.has(segment));
  const upperMethod = method.toUpperCase();
  const action: AdminAuditAction = hasExecuteHint
    ? 'execute'
    : upperMethod === 'POST'
      ? 'create'
      : upperMethod === 'DELETE'
        ? 'delete'
        : 'update';
  const actionLabel = action === 'execute'
    ? titleCase(routeSegments.at(-1) || 'action')
    : `${action.charAt(0).toUpperCase()}${action.slice(1)}d`;

  return {
    action,
    resourceType,
    resourceId,
    summary: `${actionLabel} ${titleCase(resourceType)}`,
  };
}

function normalizeTenantIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(new Set(values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item && item !== 'all')))
    .slice(0, 100);
}

async function targetTenantIds(
  request: NextRequest,
  auth: AuditAuthContext,
  forcedTenantIds?: string[],
): Promise<string[] | null> {
  const allowedTenantIds = normalizeTenantIds(forcedTenantIds || auth.tenantIds || []);
  const fromQuery = normalizeTenantIds(
    request.nextUrl.searchParams.get('tenantId')
    || request.nextUrl.searchParams.get('brandId')
    || request.nextUrl.searchParams.get('brand_id'),
  );
  let requestedTenantIds = fromQuery;

  const contentType = request.headers.get('content-type') || '';
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (!requestedTenantIds.length && contentType.includes('application/json') && contentLength <= 1_000_000) {
    try {
      const body = await request.clone().json() as Record<string, unknown>;
      const fromBody = normalizeTenantIds(
        body.tenantIds || body.tenantId || body.brandId || body.brand_id,
      );
      if (fromBody.length) requestedTenantIds = fromBody;
    } catch {
      // The mutation remains authoritative. Auditing never consumes or logs the body.
    }
  }

  if (forcedTenantIds) {
    if (!requestedTenantIds.length) return allowedTenantIds;
    const constrained = requestedTenantIds.filter((tenantId) => allowedTenantIds.includes(tenantId));
    return constrained.length ? constrained : null;
  }

  if (auth.role === 'super_admin') {
    return requestedTenantIds.length ? requestedTenantIds : allowedTenantIds;
  }

  if (!requestedTenantIds.length) return allowedTenantIds;
  const constrained = requestedTenantIds.filter((tenantId) => allowedTenantIds.includes(tenantId));
  return constrained.length ? constrained : null;
}

export async function recordAdminMutation(
  request: NextRequest,
  auth: AuditAuthContext,
  options: { fallbackTenantIds?: string[] } = {},
): Promise<void> {
  const method = (request.method || 'GET').toUpperCase();
  if (!WRITE_METHODS.has(method)) return;
  if (SELF_AUDITED_PATHS.some((pattern) => pattern.test(request.nextUrl.pathname))) return;

  try {
    const [{ default: dbConnect }, { default: AdminMutationAudit }] = await Promise.all([
      import('@/lib/dbConnect'),
      import('@/lib/models/AdminMutationAudit'),
    ]);
    await dbConnect();
    const descriptor = describeAdminMutation(method, request.nextUrl.pathname);
    const tenantIds = await targetTenantIds(request, auth, options.fallbackTenantIds);
    if (!tenantIds) return;

    await AdminMutationAudit.create({
      actorUserId: auth.userId,
      actorEmail: auth.email?.trim().toLowerCase(),
      actorName: auth.name?.trim(),
      actorRole: auth.role,
      ...descriptor,
      method,
      path: request.nextUrl.pathname,
      tenantIds,
      requestId: request.headers.get('x-request-id') || undefined,
    });
  } catch (error) {
    // Operational writes must remain available if the audit sink is temporarily
    // unavailable. The failure is still actionable in server telemetry.
    console.error(
      'Admin audit write failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

export function escapeCsvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
