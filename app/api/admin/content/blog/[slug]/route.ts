// app/api/admin/content/blog/[slug]/route.ts
// Adapter GET endpoint for the foxes-content-engine — slug-uniqueness preflight.
// Tenant-scoped: pass ?tenantId=<id> (the engine's target tenant). Without it,
// the lookup is global (any tenant), which is enough for a 404/exists check.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Blog from "@/lib/models/Blog";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  const { slug } = await ctx.params;
  const tenantId = req.nextUrl.searchParams.get("tenantId")?.trim();
  await dbConnect();

  const query: Record<string, unknown> = { slug };
  if (tenantId) query.tenantId = tenantId;
  const blog = await Blog.findOne(query).lean();
  if (!blog) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: String(blog._id),
    slug: blog.slug,
    title: blog.title,
    status: blog.status,
    updatedAt: blog.updatedAt,
  });
}
