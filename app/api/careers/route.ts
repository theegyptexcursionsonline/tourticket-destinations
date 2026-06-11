// app/api/careers/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Job from '@/lib/models/Job';

export async function GET() {
  try {
    await dbConnect();
    const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: jobs, jobs });
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
