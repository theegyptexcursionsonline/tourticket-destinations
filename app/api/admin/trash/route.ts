import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { emptyTrash, inspectTrash, type TrashKind } from '@/lib/admin/emptyTrash';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

const KINDS: TrashKind[] = ['tour', 'category', 'page'];

function readKind(request: NextRequest): TrashKind | null {
  const kind = new URL(request.url).searchParams.get('kind');
  return KINDS.includes(kind as TrashKind) ? (kind as TrashKind) : null;
}

/**
 * Tenant scope for the purge. A site-scoped admin must name the site
 * (`?tenantId=`) and may only name one they can access; only a super
 * administrator may run across all sites by omitting it.
 */
function readTenantScope(request: NextRequest, auth: { role: string; tenantIds: string[] }): string | undefined | NextResponse {
  const raw = new URL(request.url).searchParams.get('tenantId');
  const tenantId = raw && raw !== 'all' ? raw : undefined;
  if (tenantId) {
    return canAccessTenant(auth as never, tenantId) ? tenantId : tenantForbiddenResponse();
  }
  if (auth.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Choose a site before working with its trash.' },
      { status: 400 },
    );
  }
  return undefined;
}

/** Preview: what an Empty trash would remove, and what it would refuse. */
async function GETHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const kind = readKind(request);
  if (!kind) {
    return NextResponse.json({ success: false, error: 'Unknown trash type.' }, { status: 400 });
  }
  const scope = readTenantScope(request, auth);
  if (scope instanceof NextResponse) return scope;

  await dbConnect();
  const report = await inspectTrash(kind, scope);
  return NextResponse.json({ success: true, ...report });
}

/**
 * Permanently removes the trashed records that are safe to remove. This is
 * irreversible, so it is gated on a super administrator and never touches a
 * record that is still referenced (bookings, tours).
 */
async function DELETEHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Only a super administrator can permanently delete trashed items.' },
      { status: 403 },
    );
  }

  const kind = readKind(request);
  if (!kind) {
    return NextResponse.json({ success: false, error: 'Unknown trash type.' }, { status: 400 });
  }
  const scope = readTenantScope(request, auth);
  if (scope instanceof NextResponse) return scope;

  let ids: string[] | undefined;
  try {
    const body = await request.json().catch(() => null);
    if (body && Array.isArray(body.ids)) {
      ids = body.ids.map((id: unknown) => String(id)).slice(0, 200);
    }
  } catch {
    ids = undefined;
  }

  await dbConnect();
  const report = await emptyTrash(kind, scope, ids);

  registerAdminAuditDetail({
    action: 'delete',
    resourceType: `trash:${kind}`,
    summary: `Permanently deleted ${report.deleted.length} trashed ${kind}${report.deleted.length === 1 ? '' : 's'}`
      + (report.blocked.length > 0 ? `; kept ${report.blocked.length} still in use` : ''),
    changedFields: report.deleted,
  });

  if (report.deleted.length > 0) {
    revalidateStorefrontContent(scope);
  }

  return NextResponse.json({ success: true, ...report });
}

export const GET = withAdminAudit(GETHandler);
export const DELETE = withAdminAudit(DELETEHandler);
