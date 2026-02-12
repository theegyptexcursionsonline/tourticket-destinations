import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';

// Simple in-memory rate limiter to prevent like abuse
// Key: IP address, Value: { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_LIKES_PER_WINDOW = 10; // Max 10 likes per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_LIKES_PER_WINDOW) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Too many requests. Please try again later.'
      }, { status: 429 });
    }

    await dbConnect();
    
    const { slug } = await params;
    
    const blog = await Blog.findOne({ slug, status: 'published' });
    
    if (!blog) {
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 });
    }
    
    // Increment like count
    await Blog.findByIdAndUpdate(blog._id, { $inc: { likes: 1 } });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Blog post liked successfully' 
    });
  } catch (error) {
    console.error('Error liking blog post:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to like blog post' 
    }, { status: 500 });
  }
}