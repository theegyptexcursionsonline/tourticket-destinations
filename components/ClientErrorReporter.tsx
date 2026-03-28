'use client';

import { useEffect } from 'react';

/**
 * Global client-side error reporter.
 * Catches unhandled errors and promise rejections in the browser
 * and sends them to /api/client-errors so they appear in Netlify logs.
 *
 * Mount once in the root layout.
 */
export default function ClientErrorReporter() {
  useEffect(() => {
    const report = (payload: Record<string, unknown>) => {
      // Always log to browser console
      console.error('[ClientError]', payload);

      try {
        // Use sendBeacon for reliability (works even during page unload)
        const body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/client-errors', body);
        } else {
          fetch('/api/client-errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Ignore
      }
    };

    const handleError = (event: ErrorEvent) => {
      report({
        type: 'unhandled_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.slice(0, 2000),
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report({
        type: 'unhandled_rejection',
        message: reason?.message || String(reason),
        stack: reason?.stack?.slice(0, 2000),
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
