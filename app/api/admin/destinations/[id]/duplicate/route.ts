import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { buildStrictTenantQuery } from '@/lib/tenant';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';
import {
  buildDestinationDuplicate,
  createUniqueDuplicate,
  DuplicateIdentityExhaustedError,
} from '@/lib/admin/contentDuplication';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

type SourceDestination = Record<string, unknown> & {
  tenantId?: unknown;
  name?: unknown;
  slug?: unknown;
  parentPage?: unknown;
  bestDealTourIds?: unknown;
  topTourIds?: unknown;
};

async function POSTHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid destination identifier' }, { status: 400 });
  }

  try {
    await dbConnect();
    const source = await Destination.findById(id).lean<SourceDestination | null>();
    if (!source) return NextResponse.json({ success: false, error: 'Destination not found' }, { status: 404 });
    const tenantId = String(source.tenantId || '');
    if (!tenantId || !canAccessTenant(auth, tenantId)) return tenantForbiddenResponse();

    const linkedIds = [...new Set([source.bestDealTourIds, source.topTourIds]
      .flatMap((value) => Array.isArray(value) ? value : [])
      .map(String)
      .filter(Boolean))];
    if (linkedIds.length) {
      const count = await Tour.countDocuments(buildStrictTenantQuery({ _id: { $in: linkedIds } }, tenantId));
      if (count !== linkedIds.length) {
        return NextResponse.json({
          success: false,
          error: 'Correct this destination’s linked tours before duplicating it.',
          code: 'SOURCE_RELATIONSHIP_INVALID',
        }, { status: 409 });
      }
    }

    const duplicate: any = await createUniqueDuplicate({
      build: async (attempt) => {
        const draft: Record<string, any> = buildDestinationDuplicate(source, { tenantId, attempt });
        Object.assign(draft, sanitizeContentNavigation(draft));
        draft.parentPage = await validateParentPageSelection({
          parentPage: draft.parentPage as any,
          currentSlug: String(draft.slug || ''),
          tenantFilter: { tenantId },
        });
        return draft;
      },
      create: (draft) => Destination.create(draft),
    });

    revalidateStorefrontContent();
    registerAdminAuditDetail({
      action: 'create',
      resourceType: 'destinations',
      resourceId: String(duplicate._id),
      resourceLabel: String(duplicate.name),
      summary: `Duplicated destination as draft “${String(duplicate.name)}”`,
      changedFields: ['name', 'slug', 'isPublished'],
      tenantIds: [tenantId],
      replaceCapturedInput: true,
    });
    return NextResponse.json({
      success: true,
      data: duplicate,
      message: 'Draft destination copy created. Review its name and URL before publishing.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ParentPageValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    if (error instanceof DuplicateIdentityExhaustedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Destination duplication failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to duplicate destination' }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
