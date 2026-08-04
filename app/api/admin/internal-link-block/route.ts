import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import InternalLinkBlock from "@/lib/models/InternalLinkBlock";
import {
  canAccessTenant,
  requireAdminAuth,
  tenantForbiddenResponse,
} from "@/lib/auth/adminAuth";
import { sanitizeInternalLinkBlock } from "@/lib/navigation/internalLinks";
import { revalidateStorefrontContent } from "@/lib/storefront/revalidateTourStorefront";
import { buildDefaultInternalLinks } from "@/lib/navigation/defaultInternalLinks";

function selectedTenant(request: NextRequest): string | null {
  const tenantId = request.nextUrl.searchParams.get("tenantId")?.trim();
  return tenantId && tenantId !== "all" ? tenantId : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, {
    permissions: ["manageContent"],
  });
  if (auth instanceof NextResponse) return auth;
  const tenantId = selectedTenant(request);
  if (!tenantId)
    return NextResponse.json(
      { success: false, error: "Select one brand first." },
      { status: 400 },
    );
  if (auth.role !== "super_admin" && !canAccessTenant(auth, tenantId))
    return tenantForbiddenResponse();

  try {
    await dbConnect();
    const document = await InternalLinkBlock.findOne({ tenantId }).lean();
    return NextResponse.json({
      success: true,
      data: document
        ? sanitizeInternalLinkBlock(document)
        : await buildDefaultInternalLinks({ tenantId }),
    });
  } catch (error) {
    console.error("Failed to load internal-link block.", error);
    return NextResponse.json(
      { success: false, error: "Failed to load internal links." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminAuth(request, {
    permissions: ["manageContent"],
  });
  if (auth instanceof NextResponse) return auth;
  const tenantId = selectedTenant(request);
  if (!tenantId)
    return NextResponse.json(
      { success: false, error: "Select one brand first." },
      { status: 400 },
    );
  if (auth.role !== "super_admin" && !canAccessTenant(auth, tenantId))
    return tenantForbiddenResponse();

  try {
    const value = sanitizeInternalLinkBlock(await request.json());
    if (!value.heading.en) {
      return NextResponse.json(
        { success: false, error: "An English section heading is required." },
        { status: 400 },
      );
    }
    await dbConnect();
    const saved = await InternalLinkBlock.findOneAndUpdate(
      { tenantId },
      { $set: { ...value, tenantId } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean();
    revalidateStorefrontContent(tenantId);
    return NextResponse.json({
      success: true,
      data: sanitizeInternalLinkBlock(saved),
    });
  } catch (error) {
    console.error("Failed to save internal-link block.", error);
    return NextResponse.json(
      { success: false, error: "Failed to save internal links." },
      { status: 500 },
    );
  }
}
