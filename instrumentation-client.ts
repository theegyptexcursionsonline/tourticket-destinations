import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  // Admin sessions are few and every slow-dashboard report needs a trace,
  // so sample them fully; keep the public storefronts at 10%.
  tracesSampler: () => {
    if (process.env.NODE_ENV === "development") return 1.0;
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      return 1.0;
    }
    return 0.1;
  },
  enableLogs: true,
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
