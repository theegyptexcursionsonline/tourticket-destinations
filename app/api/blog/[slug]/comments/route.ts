import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/blog/[slug]/comments - Fetch all approved comments for a blog post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    void req;
    void params;
    return NextResponse.json({ comments: [], disabled: true }, { status: 200 });
  } catch (error) {
    console.error('GET /api/blog/[slug]/comments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST /api/blog/[slug]/comments - Submit a new comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    void req;
    void params;
    return NextResponse.json(
      { error: 'Blog comments are disabled.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('POST /api/blog/[slug]/comments error:', error);
    return NextResponse.json(
      { error: 'Failed to submit comment' },
      { status: 500 }
    );
  }
}
