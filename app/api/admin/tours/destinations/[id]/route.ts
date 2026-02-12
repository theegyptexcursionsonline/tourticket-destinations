import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import mongoose from 'mongoose';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
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
    
    const destination = await Destination.findByIdAndUpdate(
      id, 
      data, 
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!destination) {
      return NextResponse.json({ 
        success: false, 
        error: 'Destination not found' 
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
      const field = Object.keys(error.keyValue)[0];
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
      error: 'Failed to update destination' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
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