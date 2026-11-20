import * as Sentry from "@sentry/nextjs";
import { IGNORED_SERVER_ERRORS, shouldEnableMonitoring } from "./lib/monitoring/monitoringEnabled";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // Only a Netlify production deploy reports; local and preview runs stay silent.
  enabled:
    Boolean(dsn) &&
    shouldEnableMonitoring({
      nodeEnv: process.env.NODE_ENV,
      deployContext: process.env.SENTRY_DEPLOY_CONTEXT,
    }),
  ignoreErrors: [...IGNORED_SERVER_ERRORS],
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.CONTEXT ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
});
