import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function POST() {
  try {
    await dbConnect();
    
    const result = await Tour.updateMany(
      { isPublished: { $ne: true } }, // Find tours where isPublished is not true
      { $set: { isPublished: true } }
    );
    
    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} tours to published status`,
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Error publishing tours:', error);
    return NextResponse.json({
      success: false,
      error: (error as any).message
    }, { status: 500 });
  }
}