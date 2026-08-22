import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import { verifyContentEngine } from '@/lib/auth/verifyContentEngine';
import {
  requireContentEngineTenantFromQuery,
  strictTenantSlugQuery,
} from '@/lib/content-engine/receiverContract';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const authError = verifyContentEngine(request, { registerAuditActor: false });
  if (authError) return authError;
  const tenant = requireContentEngineTenantFromQuery(request);
  if (!tenant.ok) return tenant.response;
  const { slug } = await context.params;
  await dbConnect(tenant.tenantId);
  const doc = await Destination.findOne(strictTenantSlugQuery(tenant.tenantId, slug)).lean() as {
    _id: unknown;
    slug: string;
    name: string;
    isPublished?: boolean;
    tenantId: string;
    updatedAt?: Date;
  } | null;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    isPublished: doc.isPublished,
    tenantId: doc.tenantId,
    updatedAt: doc.updatedAt,
  });
}
