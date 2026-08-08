import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';
import {
  buildTourDuplicate,
  createUniqueDuplicate,
  DuplicateIdentityExhaustedError,
} from '@/lib/admin/contentDuplication';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { revalidateTourStorefront } from '@/lib/storefront/revalidateTourStorefront';

type SourceTour = Record<string, unknown> & {
  tenantId?: unknown;
  tenantIds?: unknown;
  title?: unknown;
  slug?: unknown;
  destination?: unknown;
  category?: unknown;
  parentPage?: unknown;
};

const ids = (value: unknown) => [...new Set((Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean))];

async function POSTHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid tour identifier' }, { status: 400 });
  }

  try {
    await dbConnect();
    const source = await Tour.findById(id).lean<SourceTour | null>();
    if (!source) return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });

    const tenantId = String(source.tenantId || '');
    const tenantIds = [...new Set([tenantId, ...ids(source.tenantIds)].filter(Boolean))];
    if (!tenantId || !tenantIds.every((candidate) => canAccessTenant(auth, candidate))) {
      return tenantForbiddenResponse();
    }

    const destinationId = source.destination ? String(source.destination) : '';
    const categoryIds = ids(source.category);
    const [destinationCount, categoryCount] = await Promise.all([
      destinationId ? Destination.countDocuments({ _id: destinationId, tenantId }) : 0,
      categoryIds.length ? Category.countDocuments({ _id: { $in: categoryIds }, tenantId }) : 0,
    ]);
    if (destinationCount !== 1 || categoryCount !== categoryIds.length) {
      return NextResponse.json({
        success: false,
        error: 'Correct this tour’s destination or category relationships before duplicating it.',
        code: 'SOURCE_RELATIONSHIP_INVALID',
      }, { status: 409 });
    }

    const duplicateId = new mongoose.Types.ObjectId().toString();
    const duplicate: any = await createUniqueDuplicate({
      build: async (attempt) => {
        const draft: Record<string, any> = buildTourDuplicate(source, { id: duplicateId, tenantId, attempt });
        Object.assign(draft, sanitizeContentNavigation(draft));
        draft.parentPage = await validateParentPageSelection({
          parentPage: draft.parentPage as any,
          currentId: duplicateId,
          currentSlug: String(draft.slug || ''),
          tenantFilter: { tenantId },
        });
        return draft;
      },
      create: (draft) => Tour.create(draft),
    });

    revalidateTourStorefront();
    registerAdminAuditDetail({
      action: 'create',
      resourceType: 'tours',
      resourceId: String(duplicate._id),
      resourceLabel: String(duplicate.title),
      summary: `Duplicated tour as draft “${String(duplicate.title)}”`,
      changedFields: ['title', 'slug', 'isPublished'],
      tenantIds,
      replaceCapturedInput: true,
    });
    return NextResponse.json({
      success: true,
      data: duplicate,
      editHref: `/admin/tours/edit/${String(duplicate._id)}`,
      message: 'Draft tour copy created. Review its title and URL before publishing.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ParentPageValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    if (error instanceof DuplicateIdentityExhaustedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Tour duplication failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to duplicate tour' }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
