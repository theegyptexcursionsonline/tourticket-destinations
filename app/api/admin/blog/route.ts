// app/api/admin/blog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const filter: Record<string, unknown> = {};
    if (tenantId && tenantId !== 'all') {
      filter.tenantId = tenantId;
    } else {
      // "All brands" — exclude default (eeo) blog posts
      filter.tenantId = { $nin: ['default', null, undefined] };
    }

    const posts = await Blog.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: posts }, { status: 200 });
  } catch (error) {
    console.error('Error listing blog posts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    const data = await request.json();
    const created = await Blog.create(data);
    return NextResponse.json({ success: true, data: created, message: 'Blog post created' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating blog post:', error);
    if (error.code === 11000 && error.keyValue) {
      const field = Object.keys(error.keyValue)[0];
      return NextResponse.json({ success: false, error: `${field} already exists` }, { status: 400 });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create blog post' }, { status: 500 });
  }
}
