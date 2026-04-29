"use client"

/**
 * app/error.tsx — React error boundary for the entire app.
 *
 * Next.js renders this component when any page or layout below the root
 * throws an unhandled error during rendering or in a Server Component.
 * "reset" re-renders the subtree that errored without a full page reload.
 */
import { useEffect } from "react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Report to Sentry in production; also log locally for dev convenience
    Sentry.captureException(error)
    if (process.env.NODE_ENV !== "production") {
      console.error("[App Error]", error)
    }
  }, [error])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center"
      style={{ background: "var(--color-page, #0A0A0F)" }}
    >
      {/* Icon */}
      <div
        className="mb-8 inline-flex items-center justify-center rounded-full p-5"
        style={{
          background: "var(--color-surface-2, #1a1a26)",
          border: "1px solid var(--color-border, #272736)",
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-accent, #2563EB)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <circle cx="12" cy="16" r="1" fill="var(--color-accent, #2563EB)" stroke="none" />
        </svg>
      </div>

      <h1
        className="text-3xl font-bold tracking-tight mb-3"
        style={{
          fontFamily: "var(--font-sora, system-ui)",
          color: "var(--color-ink, #f0f0f0)",
        }}
      >
        Something went wrong
      </h1>

      <p
        className="text-base max-w-sm leading-relaxed mb-2"
        style={{ color: "var(--color-ink-muted, #8b8ba7)" }}
      >
        An unexpected error occurred. Your journal entries are encrypted and
        were not affected.
      </p>

      {/* Show digest in development for easier debugging */}
      {process.env.NODE_ENV === "development" && error?.digest && (
        <p
          className="text-xs font-mono mb-8 px-3 py-1.5 rounded"
          style={{
            background: "var(--color-surface-2, #1a1a26)",
            color: "var(--color-ink-faint, #555570)",
          }}
        >
          {error.digest}
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs mt-8">
        <button
          onClick={reset}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background: "var(--color-accent, #2563EB)",
            color: "#ffffff",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
          style={{
            background: "var(--color-surface-2, #1a1a26)",
            border: "1px solid var(--color-border, #272736)",
            color: "var(--color-ink, #f0f0f0)",
          }}
        >
          Return home
        </Link>
      </div>

      <p
        className="mt-16 text-xs"
        style={{ color: "var(--color-ink-faint, #555570)" }}
      >
        Vaultly · Your data is always encrypted
      </p>
    </div>
  )
}
