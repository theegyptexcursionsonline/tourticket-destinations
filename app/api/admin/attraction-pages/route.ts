import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { contentPageAuditDetail } from '@/lib/admin/contentPageAudit';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import {
  PageLinkValidationError,
  validateAndNormalizePageLinks,
} from '@/lib/attractionPages/validatePageLinks';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';
import { escapeRegex } from '@/lib/utils/escapeRegex';
import { auditStamp } from '@/lib/admin/auditStamp';
import {
  contentPageDraftDefaults,
  missingContentPageFields,
} from '@/lib/admin/contentPageValidation';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    console.log('Starting to fetch attraction pages...');
    await dbConnect();
    console.log('Database connected successfully');

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const filter: Record<string, unknown> = {};
    if (tenantId && tenantId !== 'all') {
      if (!canAccessTenant(auth, tenantId)) return tenantForbiddenResponse();
      filter.tenantId = tenantId;
    } else if (auth.role !== 'super_admin') {
      filter.tenantId = { $in: auth.tenantIds };
    }

    // First, get all pages without population
    const pages = await AttractionPage.find(filter)
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    console.log(`Found ${pages.length} attraction pages`);

    // Then populate categoryId manually for better error handling
    const pagesWithCategories = await Promise.all(
      pages.map(async (page) => {
        let populatedPage = { ...page };
        
        if (page.categoryId) {
          try {
            const category = await Category.findById(page.categoryId).select('name slug').lean();
            populatedPage.categoryId = category as any;
          } catch (error) {
            console.error(`Error populating category for page ${page._id}:`, error);
            populatedPage.categoryId = null as any;
          }
        }
        
        return populatedPage;
      })
    );

    console.log('Categories populated successfully');

    // Add tour counts for each page
    const pagesWithCounts = await Promise.all(
      pagesWithCategories.map(async (page) => {
        let tourCount = 0;
        
        try {
          if (page.pageType === 'category' && page.categoryId) {
            const categoryId = typeof page.categoryId === 'object' ? (page.categoryId as any)._id : page.categoryId;
            tourCount = await Tour.countDocuments({
              category: categoryId,
              isPublished: true,
              tenantId: page.tenantId,
            });
          } else if (page.pageType === 'attraction') {
            // Count tours that match this attraction
            const searchTerms = [
              page.title,
              ...(page.keywords || []),
              ...(page.highlights || [])
            ].filter(Boolean);

            if (searchTerms.length > 0) {
              // Titles, keywords and highlights are editor content. Escape each
              // one before it becomes a pattern — the alternation between terms
              // is ours, the terms themselves must stay literal. An unescaped
              // keyword emptied the EEO storefront homepage on 2026-08-07, and
              // every tenant here shares this query shape.
              const alternation = (values: string[]) => values
                .filter((value) => value && value.trim().length > 0)
                .map(escapeRegex)
                .join('|');

              const searchQueries = [];
              searchQueries.push({ title: { $regex: new RegExp(escapeRegex(page.title), 'i') } });
              searchQueries.push({ description: { $regex: new RegExp(escapeRegex(page.title), 'i') } });

              if (page.keywords && page.keywords.length > 0) {
                const keywordPattern = alternation(page.keywords);
                searchQueries.push({ tags: { $in: page.keywords } });
                if (keywordPattern) {
                  searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(keywordPattern, 'i') } } });
                }
              }

              if (page.highlights && page.highlights.length > 0) {
                const highlightPattern = alternation(page.highlights);
                if (highlightPattern) {
                  searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(highlightPattern, 'i') } } });
                }
              }

              tourCount = await Tour.countDocuments({
                $and: [
                  { isPublished: true },
                  { tenantId: page.tenantId },
                  { $or: searchQueries }
                ]
              });
            }
          }
        } catch (error) {
          console.error(`Error counting tours for page ${page._id}:`, error);
          tourCount = 0;
        }
        
        return {
          ...page,
          tourCount
        };
      })
    );

    console.log('Tour counts added successfully');

    return NextResponse.json({ 
      success: true, 
      data: pagesWithCounts 
    });
  } catch (error) {
    console.error('Error fetching attraction pages:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch attraction pages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function POSTHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();

    const body = await request.json();
    delete body.createdBy;
    delete body.updatedBy;
    Object.assign(body, sanitizeContentNavigation(body));

    // Tenant guard: if a tenantId scope is passed (from AdminTenantContext),
    // require body.tenantId to match — or set it from the scope if missing.
    // Absent param = behave as before.
    const tenantIdParam = new URL(request.url).searchParams.get('tenantId');
    const effectiveTenantId =
      tenantIdParam && tenantIdParam !== 'all' ? tenantIdParam : undefined;
    if (effectiveTenantId) {
      if (body.tenantId && body.tenantId !== effectiveTenantId) {
        return NextResponse.json(
          { success: false, error: 'Cannot create attraction page for a different tenant' },
          { status: 403 }
        );
      }
      body.tenantId = effectiveTenantId;
    }
    const targetTenantId = String(body.tenantId || '');
    if (!targetTenantId || !canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();
    Object.assign(body, contentPageDraftDefaults(body));

    const missingFields = missingContentPageFields(body);
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    body.parentPage = await validateParentPageSelection({
      parentPage: body.parentPage,
      currentSlug: body.slug,
      tenantFilter: { tenantId: targetTenantId },
    });

    // Check if slug already exists
    const existingPage = await AttractionPage.findOne({ slug: body.slug, tenantId: targetTenantId });
    if (existingPage) {
      return NextResponse.json({
        success: false,
        error: 'Slug already exists'
      }, { status: 400 });
    }

    // Validate categoryId if pageType is category
    if (body.pageType === 'category') {
      if (!body.categoryId) {
        return NextResponse.json({
          success: false,
          error: 'Category ID is required for category pages'
        }, { status: 400 });
      }
      
      // Check if category exists
      const category = await Category.findOne({ _id: body.categoryId, tenantId: targetTenantId });
      if (!category) {
        return NextResponse.json({
          success: false,
          error: 'Category not found'
        }, { status: 400 });
      }
    }

    const author = auditStamp({ id: auth.userId, name: auth.name, email: auth.email });
    if (author) {
      body.createdBy = author;
      body.updatedBy = author;
    }

    const linkedContent = await validateAndNormalizePageLinks(body, targetTenantId);
    const page = new AttractionPage({ ...body, ...linkedContent });
    await page.save();
    revalidateStorefrontContent();

    // The record is already saved; a populate failure must not be reported
    // as a failed creation.
    try {
      await page.populate({ path: 'categoryId', select: 'name slug' });
    } catch (populateError) {
      console.warn('Created page but could not populate category:', populateError);
    }

    registerAdminAuditDetail(contentPageAuditDetail({
      kind: 'attraction page',
      operation: 'create',
      after: page,
    }));

    return NextResponse.json({
      success: true,
      data: page
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating attraction page:', error);
    if (error instanceof PageLinkValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof ParentPageValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    
    // A slug collision surfaced by the database rather than the pre-check
    // means a uniqueness rule wider than the tenant is in play. Say so
    // instead of returning an unexplained failure.
    const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoError?.code === 11000) {
      const field = Object.keys(mongoError.keyPattern || {}).join(', ') || 'slug';
      return NextResponse.json({
        success: false,
        error: `A page with this URL slug already exists (${field}). Choose a different slug.`,
      }, { status: 409 });
    }

    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create attraction page',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
