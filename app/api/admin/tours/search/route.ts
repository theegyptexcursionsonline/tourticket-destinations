// app/api/admin/tours/search/route.ts
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    // Extract the search parameters from the request URL
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    // If no slug is provided, return a bad request error
    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Search slug must be provided.' },
        { status: 400 }
      );
    }

    // Find tours that match the slug. Using find() instead of findOne()
    // to match the structure your front-end expects ([data])
    const tours = await Tour.find({ slug: slug })
      .populate('destination')
      .populate('categories');

    // If no tour is found, you can decide to return an empty array or a 404
    if (!tours || tours.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No tour found with that slug.' },
        { status: 404 }
      );
    }

    // Return the found tour(s)
    return NextResponse.json({ success: true, data: tours });
    
  } catch (error) {
    // Handle any other errors
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}