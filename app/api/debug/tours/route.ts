import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function GET() {
  try {
    await dbConnect();
    
    const tours = await Tour.find({})
      .select('title slug isPublished destination category')
      .populate('destination', 'name')
      .populate('category', 'name')
      .limit(20)
      .lean();
    
    return NextResponse.json({
      success: true,
      totalTours: tours.length,
      tours: tours.map(tour => ({
        title: tour.title,
        slug: tour.slug,
        isPublished: tour.isPublished,
        destination: (tour.destination as any)?.name || 'No destination',
        category: (tour.category as any)?.name || 'No category'
      }))
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as any).message
    }, { status: 500 });
  }
}