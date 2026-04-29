/**
 * sentry.client.config.ts
 *
 * Loaded by Next.js in the browser (client bundle).
 * DSN is read from the NEXT_PUBLIC_SENTRY_DSN env var so it is
 * available on the client without a separate server request.
 *
 * Set these in Vercel → Project → Settings → Environment Variables:
 *   NEXT_PUBLIC_SENTRY_DSN   — your project's DSN (safe to expose; public)
 *   SENTRY_AUTH_TOKEN        — required for source-map uploads (keep secret)
 *   SENTRY_ORG               — your Sentry org slug
 *   SENTRY_PROJECT           — your Sentry project slug
 */
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10 % of transactions for performance monitoring (free-tier safe)
  tracesSampleRate: 0.1,

  // Capture 10 % of sessions for session replays
  replaysSessionSampleRate: 0.1,
  // Always capture a replay when an error occurs
  replaysOnErrorSampleRate: 1.0,

  // Do not send events when there is no DSN (local dev without .env)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Strip PII from breadcrumbs / request bodies — entries are encrypted
  // at rest but we should never accidentally log plaintext in Sentry either
  beforeSend(event) {
    // Remove request body from client events (entries are always ciphertext
    // on the wire, but belt-and-suspenders)
    if (event.request?.data) {
      delete event.request.data
    }
    return event
  },

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media in replays — journal is private
      maskAllText:   true,
      blockAllMedia: true,
    }),
  ],
})
