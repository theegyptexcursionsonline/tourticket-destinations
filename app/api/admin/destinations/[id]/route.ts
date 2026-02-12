// app/api/admin/destinations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const data = await request.json();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid destination ID' 
      }, { status: 400 });
    }
    
    // Find the existing destination first
    const existingDestination = await Destination.findById(id);
    if (!existingDestination) {
      return NextResponse.json({ 
        success: false, 
        error: 'Destination not found' 
      }, { status: 404 });
    }
    
    // Validate required fields - only name and description are required
    const requiredFields = ['name', 'description'];
    const missingFields = requiredFields.filter(field => {
      if (data[field] !== undefined) {
        return !data[field]?.trim?.();
      }
      return !existingDestination[field]?.trim?.();
    });
   
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }
    
    // Prepare update data - only update fields that are provided
    const updateData: any = {};
    
    // Basic fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.longDescription !== undefined) updateData.longDescription = data.longDescription;
    
    // Media
    if (data.image !== undefined) updateData.image = data.image;
    if (data.images !== undefined) updateData.images = data.images;
    
    // Location data
    if (data.coordinates !== undefined) {
      if (data.coordinates && typeof data.coordinates === 'object') {
        const coords: any = {};
        if (data.coordinates.lat !== undefined && data.coordinates.lat !== '') {
          coords.lat = parseFloat(data.coordinates.lat);
        }
        if (data.coordinates.lng !== undefined && data.coordinates.lng !== '') {
          coords.lng = parseFloat(data.coordinates.lng);
        }
        if (coords.lat !== undefined || coords.lng !== undefined) {
          updateData.coordinates = coords;
        } else {
          updateData.coordinates = undefined;
        }
      } else {
        updateData.coordinates = data.coordinates;
      }
    }
    
    // Practical information
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.bestTimeToVisit !== undefined) updateData.bestTimeToVisit = data.bestTimeToVisit;
    
    // Content arrays
    const arrayFields = ['highlights', 'thingsToDo', 'localCustoms', 'languagesSpoken', 'weatherWarnings', 'tags'];
    arrayFields.forEach(field => {
      if (data[field] !== undefined) {
        if (Array.isArray(data[field])) {
          updateData[field] = data[field].filter((item: string) => item && item.trim());
        } else {
          updateData[field] = data[field];
        }
      }
    });
    
    // Travel information
    if (data.visaRequirements !== undefined) updateData.visaRequirements = data.visaRequirements;
    if (data.emergencyNumber !== undefined) updateData.emergencyNumber = data.emergencyNumber;
    
    // Climate & weather
    if (data.averageTemperature !== undefined) updateData.averageTemperature = data.averageTemperature;
    if (data.climate !== undefined) updateData.climate = data.climate;
    
    // Status & meta - THIS IS THE KEY PART FOR FEATURED
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.tourCount !== undefined) updateData.tourCount = data.tourCount;
    
    // SEO & meta
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
    
    // Auto-generate slug if name is updated but slug is not provided
    if (data.name && !data.slug) {
      updateData.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
    
    const destination = await Destination.findByIdAndUpdate(
      id, 
      updateData, 
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );
    
    if (!destination) {
      return NextResponse.json({
        success: false,
        error: 'Destination not found after update'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: destination,
      message: 'Destination updated successfully'
    });
    
  } catch (error: any) {
    console.error('Error updating destination:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0];
      return NextResponse.json({ 
        success: false, 
        error: `${field} already exists` 
      }, { status: 400 });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ 
        success: false, 
        error: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to update destination' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid destination ID'
      }, { status: 400 });
    }

    // Check if destination has tours
    const tourCount = await Tour.countDocuments({ destination: id });
    if (tourCount > 0) {
      if (!force) {
        return NextResponse.json({
          success: false,
          error: `Cannot delete destination. It has ${tourCount} tours associated with it. Use force=true to unlink tours and delete.`,
          tourCount
        }, { status: 400 });
      }

      // If force delete, unlink tours from this destination
      await Tour.updateMany(
        { destination: id },
        { $unset: { destination: "" } }
      );
    }

    const destination = await Destination.findByIdAndDelete(id);

    if (!destination) {
      return NextResponse.json({
        success: false,
        error: 'Destination not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: force && tourCount > 0
        ? `Destination deleted successfully. ${tourCount} tours were unlinked.`
        : 'Destination deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting destination:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete destination'
    }, { status: 500 });
  }
}