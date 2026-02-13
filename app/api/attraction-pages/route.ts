import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';

export async function GET() {
  try {
    await dbConnect();
    
    console.log('Fetching published attraction pages...');
    
    const pages = await AttractionPage.find({ isPublished: true })
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    console.log(`Found ${pages.length} published pages`);

    // Populate categories manually for better error handling
    const pagesWithCategories = await Promise.all(
      pages.map(async (page) => {
        let populatedPage = { ...page };
        
        if (page.categoryId) {
          try {
            const category = await Category.findById(page.categoryId)
              .select('name slug')
              .lean();
            populatedPage.categoryId = category as any;
          } catch (error) {
            console.error(`Error populating category for page ${page._id}:`, error);
            populatedPage.categoryId = null as any;
          }
        }
        
        return populatedPage;
      })
    );

    return NextResponse.json({ 
      success: true, 
      data: pagesWithCategories 
    });
  } catch (error) {
    console.error('Error fetching published attraction pages:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch attraction pages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}