import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

function generateOptionId() {
  return globalThis.crypto?.randomUUID?.() || `opt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    await dbConnect();
    
    const { index, option } = await request.json();
    const { tourId } = await params;

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    // Ensure bookingOptions array exists
    if (!tour.bookingOptions) {
      tour.bookingOptions = [];
    }

    const incoming = { ...(option || {}) };

    // Preserve existing id if caller didn't send it
    if (index < tour.bookingOptions.length) {
      const existing: any = tour.bookingOptions[index];
      if (!incoming.id && existing?.id) incoming.id = existing.id;
      if (!incoming.id) incoming.id = generateOptionId();

      tour.bookingOptions[index] = incoming;
    } else {
      if (!incoming.id) incoming.id = generateOptionId();
      tour.bookingOptions.push(incoming);
    }

    await tour.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Booking option updated successfully',
      bookingOptions: tour.bookingOptions 
    });

  } catch (error: any) {
    console.error('Update booking option error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update booking option' },
      { status: 500 }
    );
  }
}