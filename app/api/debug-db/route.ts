// app/api/debug-db/route.ts
export const runtime = 'nodejs'; // ensure Node runtime
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';

function maskUri(uri = '') {
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/.*:)(.*?)(@)/, '$1****$3');
  } catch {
    return '***masked***';
  }
}

export async function GET() {
  try {
    console.log('/api/debug-db called (server)');
    await dbConnect(); // ensure connection established via your lib

    const uri = process.env.MONGODB_URI ?? '';
    const match = uri.match(/mongodb(?:\+srv)?:\/\/(.*?):(.*?)@/);
    const username = match ? match[1] : null;

    const conn = mongoose.connection;
    const db = conn.db;
    const dbName = db?.databaseName ?? null;

    const collections = db && Array.isArray(await db.listCollections().toArray())
      ? (await db.listCollections().toArray()).map((c: any) => c.name)
      : [];

    console.log('DEBUG DB -> maskedUri:', maskUri(uri), 'username:', username, 'dbName:', dbName);
    return NextResponse.json({
      ok: true,
      maskedUri: maskUri(uri),
      username,
      dbName,
      collections: collections.slice(0, 50), // limit to 50
      readyState: mongoose.connection.readyState,
    });
  } catch (err) {
    console.error('/api/debug-db error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
