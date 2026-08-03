import { NextResponse } from 'next/server';

// Deploy discriminator: reports which commit this running build was made from.
// COMMIT_REF/BRANCH are provided by Netlify at build time and inlined via
// next.config.ts `env`, so the values are baked into the bundle.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    commit: process.env.COMMIT_REF || null,
    branch: process.env.BRANCH || null,
  });
}
