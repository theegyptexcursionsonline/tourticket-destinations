// POST /api/admin/pages/convert — "Change page type safely".
//
// Creates an unpublished draft of the target page type from a source page's
// shared content. The source is never mutated or deleted; the editor reviews
// the draft and retires the original manually. Everything is scoped to the
// source page's tenant: the caller must be able to access that tenant, and
// every relationship the draft carries (parent, city, linked category) must
// resolve inside it.
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { createUniqueDuplicate, DuplicateIdentityExhaustedError } from '@/lib/admin/contentDuplication';
import { auditStamp } from '@/lib/admin/auditStamp';
import dbConnect from '@/lib/dbConnect';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import {
  ParentPageValidationError,
  validateParentPageSelection,
} from '@/lib/content/validateParentPage';
import {
  PageLinkValidationError,
  validateAndNormalizePageLinks,
} from '@/lib/attractionPages/validatePageLinks';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import {
  buildPageTypeConversionDraft,
  isAllowedCrossModelConversion,
  PAGE_KIND_LABELS,
  type AdminPageKind,
} from './pageTypeConversion';

type SourcePage = Record<string, unknown> & {
  _id?: unknown;
  tenantId?: unknown;
  title?: unknown;
  name?: unknown;
  slug?: unknown;
  pageType?: unknown;
  parentPage?: unknown;
  categoryId?: unknown;
  cityDestination?: unknown;
};

class ConversionRelationshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionRelationshipError';
  }
}

const VALID_KINDS: AdminPageKind[] = ['category', 'attraction', 'category-landing'];

async function validateConvertedRelationships(
  targetKind: AdminPageKind,
  draft: SourcePage,
  tenantId: string,
): Promise<void> {
  if (draft.urlType === 'city') {
    const cityId = draft.cityDestination ? String(draft.cityDestination) : '';
    const cityCount = cityId
      ? await Destination.countDocuments({ tenantId, _id: cityId, archivedAt: null })
      : 0;
    if (cityCount !== 1) {
      throw new ConversionRelationshipError('The selected city is unavailable in this brand.');
    }
  }

  if (targetKind === 'category-landing') {
    const categoryId = draft.categoryId ? String(draft.categoryId) : '';
    const categoryCount = categoryId
      ? await Category.countDocuments({ tenantId, _id: categoryId, archivedAt: null })
      : 0;
    if (categoryCount !== 1) {
      throw new ConversionRelationshipError('The linked Category is unavailable in this brand.');
    }
  }
}

async function POSTHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null) as {
    id?: unknown;
    sourceKind?: unknown;
    targetKind?: unknown;
  } | null;
  const id = typeof body?.id === 'string' ? body.id : '';
  const sourceKind = body?.sourceKind as AdminPageKind | undefined;
  const targetKind = body?.targetKind as AdminPageKind | undefined;

  if (!mongoose.Types.ObjectId.isValid(id)
    || !sourceKind
    || !targetKind
    || !VALID_KINDS.includes(sourceKind)
    || !VALID_KINDS.includes(targetKind)
    || !isAllowedCrossModelConversion(sourceKind, targetKind)) {
    return NextResponse.json({
      success: false,
      error: 'A valid source page, current type, and target type are required',
    }, { status: 400 });
  }

  try {
    await dbConnect();
    const expectedPageType = sourceKind === 'category-landing' ? 'category' : 'attraction';
    const source = sourceKind === 'category'
      ? await Category.findOne({ _id: id, archivedAt: null }).lean<SourcePage | null>()
      : await AttractionPage.findOne({ _id: id, pageType: expectedPageType, archivedAt: null }).lean<SourcePage | null>();

    if (!source) {
      return NextResponse.json({ success: false, error: 'Source page not found' }, { status: 404 });
    }
    // Tenant boundary: the source's own tenant decides, never a client hint.
    const tenantId = String(source.tenantId || '');
    if (!tenantId || !canAccessTenant(auth, tenantId)) return tenantForbiddenResponse();

    const convertedId = new mongoose.Types.ObjectId().toString();
    const actor = auditStamp({ id: auth.userId, name: auth.name, email: auth.email });
    const converted = await createUniqueDuplicate({
      build: async (attempt) => {
        const draft = buildPageTypeConversionDraft({
          source,
          sourceKind,
          targetKind,
          tenantId,
          id: convertedId,
          attempt,
        });
        if (actor) {
          draft.createdBy = actor;
          draft.updatedBy = actor;
        }
        const navigation = sanitizeContentNavigation(draft);
        if (source.parentPage && !navigation.parentPage) {
          throw new ConversionRelationshipError('The source page has an invalid parent-page relationship.');
        }
        Object.assign(draft, navigation);
        draft.parentPage = await validateParentPageSelection({
          parentPage: navigation.parentPage,
          currentId: convertedId,
          currentSlug: String(draft.slug || ''),
          tenantFilter: { tenantId },
        });
        await validateConvertedRelationships(targetKind, draft, tenantId);
        // Only the link arrays present on the draft are validated (a Category
        // draft carries no tour listings), and every id must belong to tenantId.
        Object.assign(draft, await validateAndNormalizePageLinks(draft, tenantId, convertedId));
        return draft;
      },
      create: (draft) => targetKind === 'category'
        ? Category.create(draft)
        : AttractionPage.create(draft),
    });

    revalidateStorefrontContent();
    const record = converted as unknown as Record<string, unknown>;
    const sourceLabel = String(source.name || source.title || source.slug || id);
    const resourceLabel = String(targetKind === 'category' ? record.name : record.title);
    const targetLabel = PAGE_KIND_LABELS[targetKind];
    registerAdminAuditDetail({
      action: 'create',
      resourceType: 'pages',
      resourceId: String(record._id),
      resourceLabel,
      summary: `Transferred shared content from ${PAGE_KIND_LABELS[sourceKind]} “${sourceLabel}” to a new ${targetLabel} draft “${resourceLabel}”`,
      changedFields: ['pageType', targetKind === 'category' ? 'name' : 'title', 'slug', 'isPublished'],
      tenantIds: [tenantId],
      replaceCapturedInput: true,
    });

    const editHref = targetKind === 'category'
      ? `/admin/categories/${String(record._id)}/edit`
      : `/admin/attraction-pages/${String(record._id)}/edit`;
    return NextResponse.json({
      success: true,
      data: converted,
      editHref,
      message: `${targetLabel} draft created with the shared content. Review it before publishing.`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ParentPageValidationError
      || error instanceof PageLinkValidationError
      || error instanceof ConversionRelationshipError) {
      return NextResponse.json({
        success: false,
        error: `This page cannot be transferred safely: ${error.message}`,
        code: 'SOURCE_RELATIONSHIP_INVALID',
      }, { status: 409 });
    }
    if (error instanceof DuplicateIdentityExhaustedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Page type transfer failed:', error);
    const isValidation = error instanceof Error && error.name === 'ValidationError';
    return NextResponse.json({
      success: false,
      error: isValidation
        ? 'The source page contains data that must be corrected before it can be transferred.'
        : 'Failed to transfer page type',
    }, { status: isValidation ? 422 : 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
