import { timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest): boolean {
  const expected = process.env.SENTRY_VERIFY_SECRET;
  const provided = request.headers.get("x-monitoring-key");
  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length
    && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return new NextResponse(null, { status: 404 });
  }

  const eventId = Sentry.captureMessage(
    "EEO destinations web production monitoring verification",
    "info",
  );
  const flushed = await Sentry.flush(5000);

  return NextResponse.json({ eventId, flushed }, { status: flushed ? 200 : 503 });
}
