import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const filter: Record<string, unknown> = {};

    if (tenantId && tenantId !== 'all') {
      filter.tenantId = tenantId;
    }

    await dbConnect(tenantId && tenantId !== 'all' ? tenantId : undefined);
    const categories = await Category.find(filter).sort({ order: 1, name: 1 }).lean();

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const body = await request.json();

    if (tenantId && tenantId !== 'all') {
      if (body.tenantId && body.tenantId !== tenantId) {
        return NextResponse.json(
          { success: false, error: 'Cannot create category for a different tenant' },
          { status: 403 }
        );
      }
      body.tenantId = tenantId;
    }

    await dbConnect(tenantId && tenantId !== 'all' ? tenantId : undefined);
    const category = await Category.create(body);

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating admin category:', error);
    if (error.code === 11000 && error.keyValue) {
      const field = Object.keys(error.keyValue)[0];
      return NextResponse.json({ success: false, error: `${field} already exists` }, { status: 400 });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}
