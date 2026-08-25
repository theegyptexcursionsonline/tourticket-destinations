import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { verifyContentEngine } from '@/lib/auth/verifyContentEngine';
import {
  requireContentEngineTenantFromQuery,
  strictTenantSlugQuery,
} from '@/lib/content-engine/receiverContract';

type PopulatedTour = {
  _id: unknown;
  slug: string;
  title: string;
  isPublished?: boolean;
  tenantId: string;
  destination?: { _id: unknown; slug?: string } | null;
  category?: Array<{ _id: unknown; slug?: string }>;
  updatedAt?: Date;
};

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
  const doc = await Tour.findOne(strictTenantSlugQuery(tenant.tenantId, slug))
    .populate({ path: 'destination', select: '_id slug', match: { tenantId: tenant.tenantId } })
    .populate({ path: 'category', select: '_id slug', match: { tenantId: tenant.tenantId } })
    .lean<PopulatedTour | null>();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!doc.destination || !Array.isArray(doc.category) || doc.category.length === 0) {
    return NextResponse.json(
      { error: 'Tour relationship tenant integrity check failed' },
      { status: 409 },
    );
  }
  return NextResponse.json({
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    isPublished: doc.isPublished,
    tenantId: doc.tenantId,
    destination: { id: String(doc.destination._id), slug: doc.destination.slug },
    categories: doc.category.map((item) => ({ id: String(item._id), slug: item.slug })),
    updatedAt: doc.updatedAt,
  });
}
