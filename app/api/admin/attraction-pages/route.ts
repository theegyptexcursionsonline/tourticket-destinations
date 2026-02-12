import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';

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
      filter.tenantId = tenantId;
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
              isPublished: true
            });
          } else if (page.pageType === 'attraction') {
            // Count tours that match this attraction
            const searchTerms = [
              page.title,
              ...(page.keywords || []),
              ...(page.highlights || [])
            ].filter(Boolean);

            if (searchTerms.length > 0) {
              const searchQueries = [];
              searchQueries.push({ title: { $regex: new RegExp(page.title, 'i') } });
              searchQueries.push({ description: { $regex: new RegExp(page.title, 'i') } });
              
              if (page.keywords && page.keywords.length > 0) {
                searchQueries.push({ tags: { $in: page.keywords } });
                searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(page.keywords.join('|'), 'i') } } });
              }
              
              if (page.highlights && page.highlights.length > 0) {
                searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(page.highlights.join('|'), 'i') } } });
              }

              tourCount = await Tour.countDocuments({
                $and: [
                  { isPublished: true },
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

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const body = await request.json();
    console.log('Creating attraction page with data:', body);
    
    // Validate required fields
    const requiredFields = ['title', 'slug', 'description', 'heroImage', 'gridTitle', 'pageType'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Check if slug already exists
    const existingPage = await AttractionPage.findOne({ slug: body.slug });
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
      const category = await Category.findById(body.categoryId);
      if (!category) {
        return NextResponse.json({
          success: false,
          error: 'Category not found'
        }, { status: 400 });
      }
    }

    const page = new AttractionPage(body);
    await page.save();

    // Populate the category for response
    await page.populate({
      path: 'categoryId',
      select: 'name slug'
    });

    console.log('Attraction page created successfully:', page._id);

    return NextResponse.json({
      success: true,
      data: page
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating attraction page:', error);
    
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