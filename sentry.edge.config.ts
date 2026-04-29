/**
 * sentry.edge.config.ts
 *
 * Loaded by Next.js in the Edge Runtime (middleware, edge API routes).
 * Imported via instrumentation.ts when NEXT_RUNTIME === "edge".
 *
 * The Edge SDK is a strict subset of the Node SDK — no profiling, no
 * session replays, minimal integrations.
 */
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
