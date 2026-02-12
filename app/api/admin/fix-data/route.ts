// app/api/admin/fix-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  
  try {
    // Delete the problematic entries
    await Destination.deleteMany({
      name: { $in: ['paris', 'paris 2'] }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cleaned up existing destinations' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}