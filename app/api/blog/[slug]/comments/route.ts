import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Comment from '@/lib/models/Comment';

export const dynamic = 'force-dynamic';

// GET /api/blog/[slug]/comments - Fetch all approved comments for a blog post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Find the blog post
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    // Fetch approved comments for this blog post, sorted by newest first
    const comments = await Comment.find({
      postId: blog._id,
      postType: 'blog',
      status: 'approved',
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Transform comments to include avatar URL
    const transformedComments = comments.map((comment) => ({
      _id: comment._id.toString(),
      name: comment.name,
      email: comment.email,
      body: comment.body,
      createdAt: comment.createdAt,
      avatar: `/api/avatars/${encodeURIComponent(comment.name)}`,
    }));

    return NextResponse.json(transformedComments, { status: 200 });
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
    await dbConnect();
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Find the blog post
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, body: commentBody } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!commentBody || !commentBody.trim()) {
      return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });
    }

    // Create new comment (pending approval by default)
    const comment = await Comment.create({
      postId: blog._id,
      postType: 'blog',
      name: name.trim(),
      email: email?.trim() || '',
      body: commentBody.trim(),
      status: 'pending', // Requires moderation
      createdAt: new Date(),
    });

    // Return the created comment
    return NextResponse.json(
      {
        comment: {
          _id: (comment._id as any).toString(),
          name: comment.name,
          email: comment.email,
          body: comment.body,
          createdAt: comment.createdAt,
          avatar: `/api/avatars/${encodeURIComponent(comment.name)}`,
          pending: true,
        },
        message: 'Comment submitted successfully. It will appear after moderation.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/blog/[slug]/comments error:', error);
    return NextResponse.json(
      { error: 'Failed to submit comment' },
      { status: 500 }
    );
  }
}

