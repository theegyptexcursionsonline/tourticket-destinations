import { NextResponse } from 'next/server';

// Owner decision 2026-08-21: Algolia is retired — nothing may write to the
// shared index any more. 410 for every caller.
function gone() {
  return NextResponse.json(
    { error: 'Algolia sync has been retired.', retired: true },
    { status: 410 },
  );
}

export async function GET(_req?: Request) {
  return gone();
}

export async function POST(_req?: Request) {
  return gone();
}
