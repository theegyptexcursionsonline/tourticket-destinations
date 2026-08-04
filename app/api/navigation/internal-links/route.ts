import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import InternalLinkBlock from "@/lib/models/InternalLinkBlock";
import { getTenantFromRequest } from "@/lib/tenant";
import {
  localizeInternalLinkBlock,
  sanitizeInternalLinkBlock,
} from "@/lib/navigation/internalLinks";
import { buildDefaultInternalLinks } from "@/lib/navigation/defaultInternalLinks";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const locale = request.nextUrl.searchParams.get("locale") || "en";
    const tenantId = await getTenantFromRequest();
    await dbConnect();
    const document = await InternalLinkBlock.findOne({
      tenantId,
      enabled: true,
    }).lean();
    const value = document
      ? sanitizeInternalLinkBlock(document)
      : await buildDefaultInternalLinks({ tenantId });
    const data = localizeInternalLinkBlock(value, locale);
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load public internal links.", error);
    return NextResponse.json(
      { success: false, error: "Internal links unavailable." },
      { status: 500 },
    );
  }
}
