import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AdminMutationAudit from '@/lib/models/AdminMutationAudit';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import {
  buildAuditFilters,
  decodeAuditCursor,
  encodeAuditCursor,
  withAuditCursor,
} from '@/lib/admin/auditQuery';
import { escapeCsvCell, recordAdminMutation } from '@/lib/admin/adminAudit';
import type { AdminAuditChange, AdminAuditOutcome } from '@/lib/models/AdminMutationAudit';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

interface RawAuditRow {
  _id: unknown;
  actorUserId?: string;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  action?: string;
  outcome?: AdminAuditOutcome;
  statusCode?: number;
  resourceType?: string;
  resourceId?: string;
  resourceLabel?: string;
  targetUserId?: string;
  summary?: string;
  changedFields?: string[];
  changes?: AdminAuditChange[];
  failureCode?: string;
  method?: string;
  path?: string;
  tenantIds?: string[];
  requestId?: string;
  clientIp?: string;
  userAgent?: string;
  createdAt: Date;
}

function legacySafeRow(row: RawAuditRow) {
  return {
    id: String(row._id),
    actor: {
      id: row.actorUserId || 'unknown',
      name: row.actorName || '',
      email: row.actorEmail || '',
      role: row.actorRole || '',
    },
    action: row.action || 'execute',
    outcome: row.outcome || 'recorded',
    statusCode: Number.isFinite(row.statusCode) ? row.statusCode : null,
    resourceType: row.resourceType || (row.targetUserId ? 'team' : 'administration'),
    resourceId: row.resourceId || row.targetUserId || '',
    resourceLabel: row.resourceLabel || '',
    summary: row.summary || 'Administrative action',
    changedFields: Array.isArray(row.changedFields) ? row.changedFields : [],
    changes: Array.isArray(row.changes) ? row.changes : [],
    failureCode: row.failureCode || '',
    method: row.method || '',
    path: row.path || '',
    tenantIds: Array.isArray(row.tenantIds) ? row.tenantIds : [],
    requestId: row.requestId || '',
    clientIp: row.clientIp || '',
    userAgent: row.userAgent || '',
    createdAt: row.createdAt,
  };
}

function formatCairoTimestamp(value: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageAudit'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const searchParams = request.nextUrl.searchParams;
  const filters = buildAuditFilters(searchParams);
  const selectedTenantId = searchParams.get('tenantId');
  if (
    selectedTenantId
    && selectedTenantId !== 'all'
    && !auth.tenantIds.includes(selectedTenantId)
  ) {
    return NextResponse.json({ success: false, error: 'Brand access denied.' }, { status: 403 });
  }
  const accessScope: Record<string, unknown> = selectedTenantId && selectedTenantId !== 'all'
    ? { tenantIds: selectedTenantId }
    : { tenantIds: { $in: auth.tenantIds } };
  const scopedFilters = { $and: [filters, accessScope] };
  const exportTenantIds = selectedTenantId && selectedTenantId !== 'all'
    ? [selectedTenantId]
    : auth.tenantIds;

  if (searchParams.get('format') === 'csv') {
    // Netlify caps function time at 26s: an unbounded export dies mid-stream
    // as a corrupt half-file. Refuse loudly instead and ask for narrower
    // filters — the count is indexed and cheap.
    const exportMax = Number(process.env.AUDIT_EXPORT_MAX || 20000);
    const matching = await AdminMutationAudit.countDocuments(scopedFilters);
    if (matching > exportMax) {
      await recordAdminMutation(request, auth, {
        action: 'export',
        resourceType: 'audit',
        summary: 'Rejected audit report export',
        resourceLabel: `${matching.toLocaleString()} matching events`,
        outcome: 'rejected',
        statusCode: 400,
        failureCode: 'EXPORT_LIMIT_EXCEEDED',
        tenantIds: exportTenantIds,
      });
      return NextResponse.json({
        success: false,
        error: `This export would contain ${matching.toLocaleString()} entries (limit ${exportMax.toLocaleString()}). Narrow the date range or filters and try again.`,
      }, { status: 400 });
    }
    const encoder = new TextEncoder();
    const cursor = AdminMutationAudit.find(scopedFilters).sort({ createdAt: -1, _id: -1 }).lean().cursor();
    let exportRecorded = false;
    const recordExport = async (
      outcome: 'succeeded' | 'rejected' | 'failed',
      statusCode: number,
      failureCode?: string,
    ) => {
      if (exportRecorded) return;
      exportRecorded = true;
      await recordAdminMutation(request, auth, {
        action: 'export',
        resourceType: 'audit',
        summary: outcome === 'succeeded' ? 'Exported audit report' : 'Audit report export did not complete',
        resourceLabel: `${matching.toLocaleString()} events`,
        outcome,
        statusCode,
        failureCode,
        tenantIds: exportTenantIds,
      });
    };
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode('Time (UTC),Time (Cairo),Administrator,Email,Role,Outcome,HTTP Status,Action,Section,Target,Reference,Changed Fields,Safe Recorded Values,Brand,Method,Path,Request ID,IP Address,Device,Failure Code,Description\n'));
        try {
          for await (const raw of cursor) {
            const row = legacySafeRow(raw);
            controller.enqueue(encoder.encode([
              row.createdAt ? new Date(row.createdAt).toISOString() : '',
              row.createdAt ? formatCairoTimestamp(row.createdAt) : '',
              row.actor.name,
              row.actor.email,
              row.actor.role,
              row.outcome,
              row.statusCode,
              row.action,
              row.resourceType,
              row.resourceLabel,
              row.resourceId,
              row.changedFields.join(' | '),
              row.changes.length ? JSON.stringify(row.changes) : '',
              row.tenantIds.join(' | '),
              row.method,
              row.path,
              row.requestId,
              row.clientIp,
              row.userAgent,
              row.failureCode,
              row.summary,
            ].map(escapeCsvCell).join(',') + '\n'));
          }
          await recordExport('succeeded', 200);
          controller.close();
        } catch (error) {
          await recordExport('failed', 500, 'EXPORT_STREAM_FAILED');
          controller.error(error);
        }
      },
      async cancel() {
        await cursor.close();
        await recordExport('rejected', 499, 'EXPORT_CANCELLED');
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="eeo-network-admin-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  const requestedLimit = Number(searchParams.get('limit') || DEFAULT_LIMIT);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursor = decodeAuditCursor(searchParams.get('cursor'));
  if (searchParams.has('cursor') && !cursor) {
    return NextResponse.json({ success: false, error: 'Invalid audit cursor.' }, { status: 400 });
  }

  const [rows, total, actors, resourceTypes, actions, outcomes] = await Promise.all([
    AdminMutationAudit.find(withAuditCursor(scopedFilters, cursor))
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean(),
    AdminMutationAudit.countDocuments(scopedFilters),
    AdminMutationAudit.distinct('actorUserId', scopedFilters),
    AdminMutationAudit.distinct('resourceType', accessScope),
    AdminMutationAudit.distinct('action', accessScope),
    AdminMutationAudit.distinct('outcome', accessScope),
  ]);
  const hasMore = rows.length > limit;
  const visibleRows = rows.slice(0, limit);
  const last = visibleRows.at(-1);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayFilters = { $and: [scopedFilters, { createdAt: { $gte: today } }] };
  const [todayCount, succeededCount, rejectedCount, failedCount] = await Promise.all([
    AdminMutationAudit.countDocuments(todayFilters),
    AdminMutationAudit.countDocuments({ $and: [scopedFilters, { outcome: 'succeeded' }] }),
    AdminMutationAudit.countDocuments({ $and: [scopedFilters, { outcome: 'rejected' }] }),
    AdminMutationAudit.countDocuments({ $and: [scopedFilters, { outcome: 'failed' }] }),
  ]);

  return NextResponse.json({
    success: true,
    data: visibleRows.map(legacySafeRow),
    pagination: {
      limit,
      hasMore,
      nextCursor: hasMore && last ? encodeAuditCursor(last.createdAt, last._id) : null,
    },
    stats: {
      total,
      today: todayCount,
      administrators: actors.length,
      succeeded: succeededCount,
      rejected: rejectedCount,
      failed: failedCount,
    },
    filters: {
      actions: actions.filter(Boolean).sort(),
      resourceTypes: resourceTypes.filter(Boolean).sort(),
      outcomes: Array.from(new Set([
        'succeeded',
        'rejected',
        'failed',
        'recorded',
        ...outcomes.filter(Boolean),
      ])),
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
