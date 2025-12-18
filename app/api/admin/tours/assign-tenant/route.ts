// app/api/admin/tours/assign-tenant/route.ts
// API endpoint to bulk assign tours to a tenant

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Tenant from '@/lib/models/Tenant';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tours/assign-tenant
 * Bulk assign tours to a specific tenant
 * 
 * Request body:
 * {
 *   tourIds: string[],        // Array of tour IDs to assign
 *   tenantId: string,         // Target tenant ID
 *   syncAlgolia?: boolean     // Whether to sync to Algolia (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { tourIds, tenantId, syncAlgolia = true } = body;
    
    // Validation
    if (!tourIds || !Array.isArray(tourIds) || tourIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'tourIds array is required' },
        { status: 400 }
      );
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      );
    }
    
    // Verify tenant exists
    const tenant = await Tenant.findOne({ tenantId, isActive: true });
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: `Tenant "${tenantId}" not found or inactive` },
        { status: 404 }
      );
    }
    
    // Convert string IDs to ObjectIds and validate
    const validObjectIds = tourIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    
    if (validObjectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid tour IDs provided' },
        { status: 400 }
      );
    }
    
    // Update tours
    const updateResult = await Tour.updateMany(
      { _id: { $in: validObjectIds } },
      { 
        $set: { 
          tenantId: tenantId,
          updatedAt: new Date()
        } 
      }
    );
    
    // Sync to Algolia if requested
    if (syncAlgolia && updateResult.modifiedCount > 0) {
      try {
        const { syncTourToAlgolia } = await import('@/lib/algolia');
        const updatedTours = await Tour.find({ _id: { $in: validObjectIds }, isPublished: true })
          .populate('category', 'name')
          .populate('destination', 'name');
        
        for (const tour of updatedTours) {
          await syncTourToAlgolia(tour);
        }
        console.log(`Synced ${updatedTours.length} tours to Algolia`);
      } catch (algoliaError) {
        console.warn('Algolia sync failed:', algoliaError);
        // Don't fail the request if Algolia sync fails
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        requested: tourIds.length,
        validIds: validObjectIds.length,
        modified: updateResult.modifiedCount,
        tenantId: tenantId,
        tenantName: tenant.name,
      },
      message: `Successfully assigned ${updateResult.modifiedCount} tours to "${tenant.name}"`
    });
    
  } catch (error) {
    console.error('Error assigning tours to tenant:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign tours to tenant' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/tours/assign-tenant
 * Get tour assignment suggestions for a tenant based on keywords
 * 
 * Query params:
 * - tenantId: Target tenant ID
 * - autoDetect: If true, auto-detect tours that might belong to this tenant
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const autoDetect = searchParams.get('autoDetect') === 'true';
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      );
    }
    
    // Get tenant
    const tenant = await Tenant.findOne({ tenantId }).lean();
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    // Get tours currently assigned to this tenant
    const assignedTours = await Tour.find({ tenantId })
      .select('title slug tenantId isPublished isFeatured')
      .lean();
    
    // If auto-detect is requested, find potential matches
    let suggestedTours: any[] = [];
    
    if (autoDetect) {
      // Speedboat tenant detection
      if (tenantId === 'hurghada-speedboat') {
        const keywords = [
          'speedboat', 'snorkeling', 'diving', 'dolphin', 'island',
          'boat', 'giftun', 'orange bay', 'mahmya', 'parasailing',
          'jet ski', 'fishing', 'submarine', 'glass boat', 'yacht'
        ];
        
        const keywordRegex = keywords.map(k => new RegExp(k, 'i'));
        
        suggestedTours = await Tour.find({
          tenantId: { $ne: tenantId },
          $or: [
            { title: { $in: keywordRegex } },
            { tags: { $in: keywordRegex } },
            { description: { $in: keywordRegex } },
          ]
        })
          .select('title slug tenantId isPublished tags')
          .limit(50)
          .lean();
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          tenantId: tenant.tenantId,
          name: tenant.name,
          domain: tenant.domain,
        },
        assignedTours: assignedTours,
        assignedCount: assignedTours.length,
        suggestedTours: suggestedTours,
        suggestedCount: suggestedTours.length,
      }
    });
    
  } catch (error) {
    console.error('Error getting tour assignments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get tour assignments' },
      { status: 500 }
    );
  }
}
