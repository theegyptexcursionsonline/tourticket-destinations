// app/api/algolia/sync/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { syncToursToAlgolia, configureAlgoliaIndex } from '@/lib/algolia';

export async function POST(_request: Request) {
  try {
    await dbConnect();

    // Configure index settings
    await configureAlgoliaIndex();

    // Fetch all published tours
    const tours = await Tour.find({ isPublished: true })
      .populate('category', 'name')
      .populate('destination', 'name')
      .lean();

    if (tours.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tours to sync',
        count: 0
      });
    }

    // Sync to Algolia
    await syncToursToAlgolia(tours);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${tours.length} tours to Algolia`,
      count: tours.length
    });
  } catch (error) {
    console.error('Error syncing to Algolia:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync to Algolia'
    }, { status: 500 });
  }
}
