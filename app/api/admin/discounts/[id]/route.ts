import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;
    const body = await request.json();
    const updatedDiscount = await Discount.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedDiscount) {
      return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedDiscount });
  } catch (error) {
    console.error('Failed to update discount:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;
    const deletedDiscount = await Discount.findByIdAndDelete(id);

    if (!deletedDiscount) {
      return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Failed to delete discount:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}