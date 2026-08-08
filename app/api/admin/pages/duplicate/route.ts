import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';
import { PageLinkValidationError, validateAndNormalizePageLinks } from '@/lib/attractionPages/validatePageLinks';
import {
  buildPageDuplicate,
  createUniqueDuplicate,
  DuplicateIdentityExhaustedError,
} from '@/lib/admin/contentDuplication';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

type PageKind = 'attraction' | 'category-landing';
type SourcePage = Record<string, unknown> & {
  tenantId?: unknown;
  title?: unknown;
  slug?: unknown;
  parentPage?: unknown;
};

async function POSTHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null) as { kind?: unknown; id?: unknown } | null;
  const kind = body?.kind as PageKind | undefined;
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!kind || !['attraction', 'category-landing'].includes(kind) || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'A valid page type and identifier are required' }, { status: 400 });
  }

  try {
    await dbConnect();
    const expectedPageType = kind === 'category-landing' ? 'category' : 'attraction';
    const source = await AttractionPage.findOne({ _id: id, pageType: expectedPageType }).lean<SourcePage | null>();
    if (!source) return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    const tenantId = String(source.tenantId || '');
    if (!tenantId || !canAccessTenant(auth, tenantId)) return tenantForbiddenResponse();

    const duplicateId = new mongoose.Types.ObjectId().toString();
    const duplicate: any = await createUniqueDuplicate({
      build: async (attempt) => {
        const draft: Record<string, any> = buildPageDuplicate(source, { id: duplicateId, tenantId, attempt });
        Object.assign(draft, sanitizeContentNavigation(draft));
        draft.parentPage = await validateParentPageSelection({
          parentPage: draft.parentPage as any,
          currentId: duplicateId,
          currentSlug: String(draft.slug || ''),
          tenantFilter: { tenantId },
        });
        Object.assign(draft, await validateAndNormalizePageLinks(draft, tenantId, duplicateId));
        return draft;
      },
      create: (draft) => AttractionPage.create(draft),
    });

    revalidateStorefrontContent();
    registerAdminAuditDetail({
      action: 'create',
      resourceType: 'pages',
      resourceId: String(duplicate._id),
      resourceLabel: String(duplicate.title),
      summary: `Duplicated page as draft “${String(duplicate.title)}”`,
      changedFields: ['title', 'slug', 'isPublished'],
      tenantIds: [tenantId],
      replaceCapturedInput: true,
    });
    return NextResponse.json({
      success: true,
      data: duplicate,
      editHref: `/admin/attraction-pages/${String(duplicate._id)}/edit`,
      message: 'Draft page copy created. Review its title and URL before publishing.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ParentPageValidationError || error instanceof PageLinkValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    if (error instanceof DuplicateIdentityExhaustedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Page duplication failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to duplicate page' }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
