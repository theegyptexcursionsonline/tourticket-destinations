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
import { escapeCsvCell } from '@/lib/admin/adminAudit';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

interface RawAuditRow {
  _id: unknown;
  actorUserId?: string;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  targetUserId?: string;
  summary?: string;
  method?: string;
  tenantIds?: string[];
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
    resourceType: row.resourceType || (row.targetUserId ? 'team' : 'administration'),
    resourceId: row.resourceId || row.targetUserId || '',
    summary: row.summary || 'Administrative action',
    method: row.method || '',
    tenantIds: Array.isArray(row.tenantIds) ? row.tenantIds : [],
    createdAt: row.createdAt,
  };
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
    && auth.role !== 'super_admin'
    && !auth.tenantIds.includes(selectedTenantId)
  ) {
    return NextResponse.json({ success: false, error: 'Brand access denied.' }, { status: 403 });
  }
  const accessScope: Record<string, unknown> = selectedTenantId && selectedTenantId !== 'all'
    ? { tenantIds: selectedTenantId }
    : auth.role === 'super_admin'
      ? {}
      : { tenantIds: { $in: auth.tenantIds } };
  const scopedFilters = Object.keys(accessScope).length
    ? { $and: [filters, accessScope] }
    : filters;

  if (searchParams.get('format') === 'csv') {
    const encoder = new TextEncoder();
    const cursor = AdminMutationAudit.find(scopedFilters).sort({ createdAt: -1, _id: -1 }).lean().cursor();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode('Time,Administrator,Email,Role,Action,Section,Reference,Brand,Method,Description\n'));
        try {
          for await (const raw of cursor) {
            const row = legacySafeRow(raw);
            controller.enqueue(encoder.encode([
              row.createdAt ? new Date(row.createdAt).toISOString() : '',
              row.actor.name,
              row.actor.email,
              row.actor.role,
              row.action,
              row.resourceType,
              row.resourceId,
              row.tenantIds.join(' | '),
              row.method,
              row.summary,
            ].map(escapeCsvCell).join(',') + '\n'));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        void cursor.close();
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

  const [rows, total, actors, resourceTypes, actions] = await Promise.all([
    AdminMutationAudit.find(withAuditCursor(scopedFilters, cursor))
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean(),
    AdminMutationAudit.countDocuments(scopedFilters),
    AdminMutationAudit.distinct('actorUserId', scopedFilters),
    AdminMutationAudit.distinct('resourceType', accessScope),
    AdminMutationAudit.distinct('action', accessScope),
  ]);
  const hasMore = rows.length > limit;
  const visibleRows = rows.slice(0, limit);
  const last = visibleRows.at(-1);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayFilters = { $and: [scopedFilters, { createdAt: { $gte: today } }] };
  const todayCount = await AdminMutationAudit.countDocuments(todayFilters);

  return NextResponse.json({
    success: true,
    data: visibleRows.map(legacySafeRow),
    pagination: {
      limit,
      hasMore,
      nextCursor: hasMore && last ? encodeAuditCursor(last.createdAt, last._id) : null,
    },
    stats: { total, today: todayCount, administrators: actors.length },
    filters: {
      actions: actions.filter(Boolean).sort(),
      resourceTypes: resourceTypes.filter(Boolean).sort(),
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
