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
    const sanitizeText = (value: unknown, max: number) =>
      typeof value === 'string' ? value.replace(/[\r\n\t]/g, ' ').slice(0, max) : undefined;
    const sanitizeUrl = (value: unknown) => {
      if (typeof value !== 'string') return undefined;
      try {
        const url = new URL(value);
        return `${url.origin}${url.pathname}`.slice(0, 500);
      } catch {
        return sanitizeText(value.split('?')[0], 500);
      }
    };

    console.error('[CLIENT ERROR]', JSON.stringify({
      type: body.type || 'react_error',
      message: sanitizeText(body.message, 1000),
      url: sanitizeUrl(body.url),
      filename: sanitizeUrl(body.filename),
      lineno: body.lineno,
      stack: sanitizeText(body.stack, 3000),
      componentStack: sanitizeText(body.componentStack, 3000),
      userAgent: body.userAgent?.slice(0, 200),
      timestamp: body.timestamp || new Date().toISOString(),
    }, null, 0));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
