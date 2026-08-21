import { NextResponse } from 'next/server';

// Owner decision 2026-08-21: search runs on the AI Search agent and the
// Mongo-backed /api/search/tours — Algolia is retired. This endpoint formerly
// queried a search index shared by every storefront with no per-site
// ownership, so it could return (and leak) another site's catalogue. It now
// answers 410 for every caller instead of serving cross-site results.
function gone() {
  return NextResponse.json(
    {
      error: 'This search endpoint has been retired. Use /api/search/tours.',
      retired: true,
    },
    { status: 410 },
  );
}

export async function GET(_req?: Request) {
  return gone();
}

export async function POST(_req?: Request) {
  return gone();
}
