// app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import { getTenantFromRequest, buildTenantQuery } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    // Get tenant from request
    const tenantId = await getTenantFromRequest();
    await dbConnect(tenantId);
    
    // If tenant has its own categories, show only those (no default fallback)
    const ownCount = await Category.countDocuments({ tenantId });
    const catQuery = ownCount > 0
      ? { tenantId }
      : buildTenantQuery({}, tenantId);

    const categories = await Category.find(catQuery)
      .sort({ order: 1, name: 1 })
      .lean();

    // Get all category IDs for batch counting
    const categoryIds = categories.map((c: any) => c._id);
    
    // Batch count tours per category using aggregation (more efficient)
    const tourCounts = await Tour.aggregate([
      { 
        $match: { 
          isPublished: true,
          category: { $in: categoryIds },
          $or: [
            { tenantId: { $in: [tenantId, 'default'] } },
            { tenantId: { $exists: false } }
          ]
        } 
      },
      { $unwind: '$category' },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).catch(() => []);
    
    // Create lookup map
    const countMap = new Map(tourCounts.map((c: any) => [c._id?.toString(), c.count]));
    
    // Add tour counts
    const categoriesWithCounts = categories.map((category: any) => ({
      ...category,
      tourCount: countMap.get(category._id?.toString()) || 0
    }));

    return NextResponse.json({ 
      success: true, 
      data: categoriesWithCounts 
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch categories' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json({
        success: false,
        error: 'Name and slug are required'
      }, { status: 400 });
    }

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug: body.slug });
    if (existingCategory) {
      return NextResponse.json({
        success: false,
        error: 'Slug already exists'
      }, { status: 400 });
    }

    const category = new Category(body);
    await category.save();

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create category'
    }, { status: 500 });
  }
}