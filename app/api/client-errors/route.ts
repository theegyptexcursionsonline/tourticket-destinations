import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/client-errors
 *
 * Receives client-side JavaScript errors reported by ClientErrorReporter
 * and ClientErrorBoundary, then logs them to stdout so they appear in
 * Netlify function logs alongside server errors.
 *
 * This gives you full visibility into client-side crashes without needing
 * a separate service like Sentry.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Rate-limit protection: ignore payloads > 10KB
    const raw = JSON.stringify(body);
    if (raw.length > 10_000) {
      return NextResponse.json({ ok: false, reason: 'payload_too_large' }, { status: 413 });
    }

    // Log to stdout — appears in Netlify function logs
    console.error('[CLIENT ERROR]', JSON.stringify({
      type: body.type || 'react_error',
      message: body.message,
      url: body.url,
      filename: body.filename,
      lineno: body.lineno,
      stack: body.stack?.split('\n').slice(0, 5).join('\n'),
      componentStack: body.componentStack?.split('\n').slice(0, 5).join('\n'),
      userAgent: body.userAgent?.slice(0, 200),
      timestamp: body.timestamp || new Date().toISOString(),
    }, null, 0));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
