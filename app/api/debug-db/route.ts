// app/api/debug-db/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const conn = mongoose.connection;
    const dbName = conn.db?.databaseName ?? null;

    return NextResponse.json({
      ok: true,
      dbName,
      readyState: mongoose.connection.readyState,
    });
  } catch (error) {
    console.error('Debug DB error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ ok: false, error: 'Failed to get DB status' }, { status: 500 });
  }
}
