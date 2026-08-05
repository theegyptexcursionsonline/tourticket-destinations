import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextRequest } from 'next/server';
import type { AdminPermission, AdminRole } from '@/lib/constants/adminPermissions';
import type {
  AdminAuditAction,
  AdminAuditOutcome,
  AdminAuditChange,
} from '@/lib/models/AdminMutationAudit';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXECUTE_HINTS = new Set([
  'activate', 'approve', 'archive', 'assign', 'bulk', 'cancel', 'cleanup',
  'publish', 'refund', 'resend', 'restore', 'revoke', 'sync', 'translate', 'upload',
]);
const ROUTE_ACTION_SEGMENTS = new Set([...EXECUTE_HINTS, 'permanent']);
const PRIVATE_FIELD = /(?:password|passcode|token|secret|otp|twofactor|2fa|recovery|authorization|cookie|customer|guest|phone|mobile|address|emergency|specialrequest|payment|card|cvv|iban|email)/i;
const SAFE_VALUE_FIELDS = new Set([
  'action', 'active', 'brandid', 'capacity', 'code', 'currency', 'discountpercent',
  'discountpercentage', 'discountprice', 'enabled', 'featured', 'isactive',
  'ispublished', 'language', 'locale', 'order', 'percentage', 'permissions',
  'position', 'price', 'published', 'quantity', 'role', 'slug', 'sortorder',
  'state', 'status', 'tenantid', 'tenantids', 'type', 'visibility',
]);
const TARGET_ID_FIELDS = new Set([
  '_id', 'id', 'bookingid', 'categoryid', 'destinationid', 'discountid', 'offerid',
  'resourceid', 'targetuserid', 'tourid', 'userid',
]);
const MAX_BODY_BYTES = 1_000_000;
const MAX_CHANGED_FIELDS = 100;
const MAX_SAFE_CHANGES = 40;

export interface AuditAuthContext {
  userId: string;
  email?: string;
  name?: string;
  role: AdminRole | 'system';
  permissions: AdminPermission[];
  tenantIds?: string[];
}

export interface AdminAuditDescriptor {
  action: AdminAuditAction;
  resourceType: string;
  resourceId?: string;
  summary: string;
}

export interface AdminAuditDetail {
  action?: AdminAuditAction;
  resourceType?: string;
  resourceId?: string;
  resourceLabel?: string;
  summary?: string;
  changedFields?: string[];
  changes?: AdminAuditChange[];
  tenantIds?: string[];
  replaceCapturedInput?: boolean;
}

interface CapturedAuditInput {
  tenantIds: string[];
  resourceId?: string;
  resourceLabel?: string;
  changedFields: string[];
  changes: AdminAuditChange[];
}

interface AuditRequestState {
  request: NextRequest;
  input: Promise<CapturedAuditInput>;
  actor?: AuditAuthContext;
  fallbackTenantIds?: string[];
  detail?: AdminAuditDetail;
  finalized?: boolean;
}

const auditRequestStorage = new AsyncLocalStorage<AuditRequestState>();

const titleCase = (value: string) => value
  .split(/[-_]/g)
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const isIdentifier = (value: string) => /^[a-f\d]{24}$/i.test(value)
  || /^[a-z0-9][a-z0-9-]{5,}$/i.test(value);

const normalizedFieldName = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();

function requestPath(request: NextRequest): string {
  if (request.nextUrl?.pathname) return request.nextUrl.pathname;
  try {
    return new URL(request.url).pathname;
  } catch {
    return '/api/admin';
  }
}

export function describeAdminMutation(method: string, pathname: string): AdminAuditDescriptor {
  const segments = pathname.split('/').filter(Boolean);
  const adminIndex = segments.findIndex((segment) => segment === 'admin');
  const routeSegments = (adminIndex >= 0 ? segments.slice(adminIndex + 1) : segments.slice(1))
    .filter((segment) => segment !== 'api');
  const resourceType = routeSegments[0] || 'administration';
  const resourceId = [...routeSegments].reverse().find((segment) => (
    segment !== resourceType
    && !ROUTE_ACTION_SEGMENTS.has(segment)
    && isIdentifier(segment)
  ));
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

function boundedScalar(value: unknown): string | number | boolean | string[] | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return value.trim().slice(0, 300);
  if (Array.isArray(value) && value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
    return value.slice(0, 30).map((item) => String(item).slice(0, 120));
  }
  return undefined;
}

function captureObject(
  value: unknown,
  path: string,
  changedFields: string[],
  changes: AdminAuditChange[],
  flatValues: Map<string, unknown>,
  depth = 0,
): void {
  if (!value || typeof value !== 'object' || depth > 5 || Array.isArray(value)) return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (changedFields.length >= MAX_CHANGED_FIELDS) return;
    const normalized = normalizedFieldName(key);
    if (!normalized || PRIVATE_FIELD.test(normalized)) continue;
    const fieldPath = path ? `${path}.${key}` : key;
    flatValues.set(normalized, child);
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      captureObject(child, fieldPath, changedFields, changes, flatValues, depth + 1);
      continue;
    }
    changedFields.push(fieldPath.slice(0, 160));
    if (changes.length < MAX_SAFE_CHANGES && SAFE_VALUE_FIELDS.has(normalized)) {
      const after = boundedScalar(child);
      if (after !== undefined) changes.push({ field: fieldPath.slice(0, 160), after });
    }
  }
}

function pickString(flatValues: Map<string, unknown>, fields: string[]): string | undefined {
  for (const field of fields) {
    const value = flatValues.get(field);
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 160);
  }
  return undefined;
}

function captureAuditInput(request: NextRequest): Promise<CapturedAuditInput> {
  const pathname = requestPath(request);
  const contentType = request.headers.get('content-type') || '';
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (!contentType.includes('application/json') || contentLength > MAX_BODY_BYTES) {
    return Promise.resolve({ tenantIds: [], changedFields: [], changes: [] });
  }

  let clone: Request;
  try {
    clone = request.clone();
  } catch {
    return Promise.resolve({ tenantIds: [], changedFields: [], changes: [] });
  }

  return clone.json()
    .then((body: unknown) => {
      const changedFields: string[] = [];
      const changes: AdminAuditChange[] = [];
      const flatValues = new Map<string, unknown>();
      captureObject(body, '', changedFields, changes, flatValues);
      if (pathname === '/api/admin/2fa') {
        for (let index = changedFields.length - 1; index >= 0; index -= 1) {
          if (normalizedFieldName(changedFields[index]) === 'code') changedFields.splice(index, 1);
        }
        for (let index = changes.length - 1; index >= 0; index -= 1) {
          if (normalizedFieldName(changes[index].field) === 'code') changes.splice(index, 1);
        }
      }
      const tenantIds = normalizeTenantIds(
        flatValues.get('tenantids')
        || flatValues.get('tenantid')
        || flatValues.get('brandid'),
      );
      const resourceId = Array.from(TARGET_ID_FIELDS)
        .map((field) => flatValues.get(field))
        .find((value): value is string => typeof value === 'string' && value.trim().length > 1)
        ?.trim()
        .slice(0, 160);
      const resourceType = describeAdminMutation(request.method, pathname).resourceType;
      const labelFields = resourceType === '2fa'
        ? ['action']
        : resourceType === 'bookings'
        ? ['bookingreference', 'reference']
        : resourceType === 'team' || resourceType === 'users'
          ? ['email', 'name']
          : ['title', 'name', 'slug', 'code'];
      const resourceLabel = pickString(flatValues, labelFields);
      return { tenantIds, resourceId, resourceLabel, changedFields, changes };
    })
    .catch(() => ({ tenantIds: [], changedFields: [], changes: [] }));
}

async function targetTenantIds(
  request: NextRequest,
  auth: AuditAuthContext,
  capturedTenantIds: string[],
  forcedTenantIds?: string[],
): Promise<string[] | null> {
  const allowedTenantIds = normalizeTenantIds(forcedTenantIds || auth.tenantIds || []);
  const fromQuery = normalizeTenantIds(
    request.nextUrl.searchParams.get('tenantId')
    || request.nextUrl.searchParams.get('brandId')
    || request.nextUrl.searchParams.get('brand_id'),
  );
  const requestedTenantIds = fromQuery.length ? fromQuery : capturedTenantIds;

  if (forcedTenantIds) {
    if (!requestedTenantIds.length) return allowedTenantIds;
    const constrained = requestedTenantIds.filter((tenantId) => allowedTenantIds.includes(tenantId));
    return constrained.length ? constrained : null;
  }

  if (!requestedTenantIds.length) return allowedTenantIds;
  const constrained = requestedTenantIds.filter((tenantId) => allowedTenantIds.includes(tenantId));
  return constrained.length ? constrained : null;
}

function clientMetadata(request: NextRequest): { clientIp?: string; userAgent?: string; requestId?: string } {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientIp = request.headers.get('x-nf-client-connection-ip')?.trim() || forwarded || undefined;
  const userAgent = request.headers.get('user-agent')?.trim().slice(0, 400) || undefined;
  const requestId = request.headers.get('x-request-id')?.trim().slice(0, 160) || undefined;
  return {
    clientIp: clientIp?.slice(0, 80),
    userAgent,
    requestId,
  };
}

async function reportAuditFailure(error: unknown, path: string): Promise<void> {
  console.error('Admin audit write failed:', error instanceof Error ? error.message : 'Unknown error');
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(error, {
      tags: { subsystem: 'admin-audit', path },
      level: 'error',
    });
  } catch {
    // The audit path remains fail-open even if telemetry is unavailable.
  }
}

async function writeAdminAudit(params: {
  request: NextRequest;
  auth: AuditAuthContext;
  input: CapturedAuditInput;
  detail?: AdminAuditDetail;
  fallbackTenantIds?: string[];
  outcome: AdminAuditOutcome;
  statusCode: number;
  failureCode?: string;
}): Promise<void> {
  const { request, auth, input, detail, fallbackTenantIds, outcome, statusCode, failureCode } = params;
  const method = (request.method || 'GET').toUpperCase();
  const path = requestPath(request);
  try {
    const [{ default: dbConnect }, { default: AdminMutationAudit }] = await Promise.all([
      import('@/lib/dbConnect'),
      import('@/lib/models/AdminMutationAudit'),
    ]);
    await dbConnect();
    const descriptor = describeAdminMutation(method, path);
    const tenantIds = await targetTenantIds(
      request,
      auth,
      detail?.tenantIds || input.tenantIds,
      fallbackTenantIds,
    );
    if (!tenantIds) return;
    const resourceId = detail?.resourceId || descriptor.resourceId || input.resourceId;
    const resourceLabel = detail?.resourceLabel || input.resourceLabel;

    await AdminMutationAudit.create({
      actorUserId: auth.userId,
      actorEmail: auth.email?.trim().toLowerCase(),
      actorName: auth.name?.trim(),
      actorRole: auth.role,
      action: detail?.action || descriptor.action,
      resourceType: detail?.resourceType || descriptor.resourceType,
      resourceId,
      resourceLabel,
      summary: detail?.summary || descriptor.summary,
      outcome,
      statusCode,
      changedFields: Array.from(new Set(detail?.replaceCapturedInput
        ? (detail.changedFields || [])
        : [...input.changedFields, ...(detail?.changedFields || [])]
      )).slice(0, MAX_CHANGED_FIELDS),
      changes: (detail?.replaceCapturedInput
        ? (detail.changes || [])
        : [...input.changes, ...(detail?.changes || [])]
      ).slice(0, MAX_SAFE_CHANGES),
      failureCode,
      method,
      path,
      tenantIds,
      ...clientMetadata(request),
    });
  } catch (error) {
    await reportAuditFailure(error, path);
  }
}

function outcomeForStatus(statusCode: number): AdminAuditOutcome {
  if (statusCode >= 500) return 'failed';
  if (statusCode >= 400) return 'rejected';
  return 'succeeded';
}

async function responseFailureCode(response: Response): Promise<string | undefined> {
  if (response.status < 400) return undefined;
  const contentType = response.headers?.get?.('content-type') || '';
  const contentLength = Number(response.headers?.get?.('content-length') || '0');
  if (!contentType.includes('application/json') || contentLength > 64_000 || typeof response.clone !== 'function') {
    return `HTTP_${response.status}`;
  }
  try {
    const payload = await response.clone().json() as { code?: unknown };
    const code = typeof payload.code === 'string' ? payload.code.trim() : '';
    return /^[A-Z0-9_-]{2,80}$/i.test(code) ? code : `HTTP_${response.status}`;
  } catch {
    return `HTTP_${response.status}`;
  }
}

async function finalizeAdminAudit(response: Response | undefined, thrown?: unknown): Promise<void> {
  const state = auditRequestStorage.getStore();
  if (!state || state.finalized || !state.actor) return;
  state.finalized = true;
  const statusCode = thrown ? 500 : Number(response?.status || 200);
  const failureCode = thrown
    ? 'UNHANDLED_EXCEPTION'
    : response
      ? await responseFailureCode(response)
      : undefined;
  await writeAdminAudit({
    request: state.request,
    auth: state.actor,
    input: await state.input,
    detail: state.detail,
    fallbackTenantIds: state.fallbackTenantIds,
    outcome: outcomeForStatus(statusCode),
    statusCode,
    failureCode,
  });
}

type RouteHandler<Args extends unknown[]> = (
  request: NextRequest,
  ...args: Args
) => Response | Promise<Response>;

export function withAdminAudit<Args extends unknown[]>(handler: RouteHandler<Args>): RouteHandler<Args> {
  return async (request: NextRequest, ...args: Args) => {
    const method = (request.method || 'GET').toUpperCase();
    if (!WRITE_METHODS.has(method)) return handler(request, ...args);
    const state: AuditRequestState = { request, input: captureAuditInput(request) };
    return auditRequestStorage.run(state, async () => {
      try {
        const response = await handler(request, ...args);
        await finalizeAdminAudit(response);
        return response;
      } catch (error) {
        await finalizeAdminAudit(undefined, error);
        throw error;
      }
    });
  };
}

export function registerAdminAuditActor(
  auth: AuditAuthContext,
  options: { fallbackTenantIds?: string[] } = {},
): void {
  const state = auditRequestStorage.getStore();
  if (!state) return;
  state.actor = auth;
  state.fallbackTenantIds = options.fallbackTenantIds;
}

export function registerAdminAuditDetail(detail: AdminAuditDetail): void {
  const state = auditRequestStorage.getStore();
  if (!state) return;
  state.detail = { ...state.detail, ...detail };
}

export async function recordAdminMutation(
  request: NextRequest,
  auth: AuditAuthContext,
  options: AdminAuditDetail & {
    fallbackTenantIds?: string[];
    outcome?: AdminAuditOutcome;
    statusCode?: number;
    failureCode?: string;
  } = {},
): Promise<void> {
  const method = (request.method || 'GET').toUpperCase();
  if (!WRITE_METHODS.has(method) && options.action !== 'export') return;
  await writeAdminAudit({
    request,
    auth,
    input: await captureAuditInput(request),
    detail: options,
    fallbackTenantIds: options.fallbackTenantIds,
    outcome: options.outcome || outcomeForStatus(options.statusCode || 200),
    statusCode: options.statusCode || 200,
    failureCode: options.failureCode,
  });
}

// Sign-ins are actions a supervisor follows too. Called from the session
// completion points (password login for enrollment sessions, the 2FA verify
// for every production admin) — never from the dev-only env-admin path.
export async function recordAdminLogin(
  actor: { userId: string; email?: string; name?: string; role: AdminRole },
  path: string,
  tenantIds: string[] = [],
): Promise<void> {
  try {
    const [{ default: dbConnect }, { default: AdminMutationAudit }] = await Promise.all([
      import('@/lib/dbConnect'),
      import('@/lib/models/AdminMutationAudit'),
    ]);
    await dbConnect();
    await AdminMutationAudit.create({
      actorUserId: actor.userId,
      actorEmail: actor.email?.trim().toLowerCase(),
      actorName: actor.name?.trim(),
      actorRole: actor.role,
      action: 'login',
      resourceType: 'session',
      summary: 'Signed in',
      outcome: 'succeeded',
      statusCode: 200,
      changedFields: [],
      changes: [],
      method: 'POST',
      path,
      tenantIds,
    });
  } catch (error) {
    await reportAuditFailure(error, path);
  }
}

export function escapeCsvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
