// app/api/admin/reviews/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';

// Defensive helper: when an admin is scoped to a single tenant via the
// AdminTenantContext, every write must include `?tenantId=xxx`. We use that
// to require the target document to belong to that tenant. Absent param =
// behave as before (no enforcement).
function getTenantScope(request: NextRequest): string | undefined {
  const tenantIdParam = new URL(request.url).searchParams.get('tenantId');
  return tenantIdParam && tenantIdParam !== 'all' ? tenantIdParam : undefined;
}

// --- PATCH: Update a specific review (e.g., approve it) ---
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await dbConnect();

  try {
    const body = await request.json();
    const { verified } = body; // Expecting { verified: true }
    const existing = await Review.findById(id).select('tenantId').lean();
    if (!existing) return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    const targetTenantId = String((existing as any).tenantId || 'default');
    if (!canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();

    const tenantId = getTenantScope(request);
    if (tenantId && tenantId !== targetTenantId) return tenantForbiddenResponse();
    const updateFilter: Record<string, unknown> = { _id: id, tenantId: targetTenantId };

    const updatedReview = await Review.findOneAndUpdate(
      updateFilter,
      { verified },
      { new: true, runValidators: true }
    );

    if (!updatedReview) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(updatedReview);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update review', error: (error as Error).message }, { status: 500 });
  }
}

// --- DELETE: Remove a specific review ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await dbConnect();

  try {
    const existing = await Review.findById(id).select('tenantId').lean();
    if (!existing) return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    const targetTenantId = String((existing as any).tenantId || 'default');
    if (!canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();
    const tenantId = getTenantScope(request);
    if (tenantId && tenantId !== targetTenantId) return tenantForbiddenResponse();
    const deleteFilter: Record<string, unknown> = { _id: id, tenantId: targetTenantId };

    const deletedReview = await Review.findOneAndDelete(deleteFilter);

    if (!deletedReview) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Review deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete review', error: (error as Error).message }, { status: 500 });
  }
}
