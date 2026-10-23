import { NextResponse } from 'next/server';

// Build identity is inlined by Next.js; the runtime version is read per request.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
      commit: process.env.COMMIT_REF || null,
      branch: process.env.BRANCH || null,
      node: process.version,
    },
    {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}
