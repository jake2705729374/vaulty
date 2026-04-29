/**
 * sentry.server.config.ts
 *
 * Loaded by Next.js on the Node.js server (API routes, Server Components,
 * server actions).  Imported via instrumentation.ts when NEXT_RUNTIME === "nodejs".
 */
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10 % of transactions for performance monitoring
  tracesSampleRate: 0.1,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  beforeSend(event) {
    // Never include request bodies in server events — they could contain
    // ciphertext (fine) but also passwords in auth routes (not fine)
    if (event.request?.data) {
      delete event.request.data
    }
    // Redact Authorization headers
    if (event.request?.headers) {
      delete (event.request.headers as Record<string, unknown>)["authorization"]
      delete (event.request.headers as Record<string, unknown>)["cookie"]
    }
    return event
  },
})
