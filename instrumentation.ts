/**
 * instrumentation.ts
 *
 * Next.js Instrumentation Hook — runs once when the server boots.
 * Used to initialise Sentry on the server and edge runtimes.
 * The client-side init lives in sentry.client.config.ts and is
 * automatically picked up by @sentry/nextjs's webpack plugin.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}
