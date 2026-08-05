// lib/auth/verifyContentEngine.ts
// Bearer-token auth for the foxes-content-engine adapter routes.
// The engine pushes published drafts via POST /api/admin/content/:type
// using a Bearer API key stored in CONTENT_ENGINE_API_KEY.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { registerAdminAuditActor } from "@/lib/admin/adminAudit";
import { ADMIN_NETWORK_TENANT_IDS } from "@/lib/auth/adminNetworkScope";

export function verifyContentEngine(req: NextRequest): NextResponse | null {
  const expected = process.env.CONTENT_ENGINE_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Content engine adapter is not configured (missing CONTENT_ENGINE_API_KEY)" },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const presented = header.slice(7).trim();
  if (presented.length !== expected.length) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  registerAdminAuditActor({
    userId: "content-engine",
    name: "Content Engine",
    role: "system",
    permissions: [],
    // `default` remains supported only for the adapter's existing legacy
    // fallback; named English-network brands are otherwise authoritative.
    tenantIds: ["default", ...ADMIN_NETWORK_TENANT_IDS],
  });

  return null;
}
