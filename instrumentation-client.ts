import * as Sentry from "@sentry/nextjs";
import { shouldEnableMonitoring } from "@/lib/monitoring/monitoringEnabled";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // Only a Netlify production deploy reports; local and preview runs stay silent.
  enabled:
    Boolean(dsn) &&
    shouldEnableMonitoring({
      nodeEnv: process.env.NODE_ENV,
      deployContext: process.env.SENTRY_DEPLOY_CONTEXT,
      hostname: typeof window === "undefined" ? null : window.location.hostname,
    }),
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
  // Embedded widgets (search, voice, sign-in) are other origins. Safari throws
  // when the session recorder probes a cross-origin frame, so frames stay opaque
  // in recordings; the page around them is still recorded.
  integrations: [Sentry.replayIntegration({ block: ["iframe"] })],
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
