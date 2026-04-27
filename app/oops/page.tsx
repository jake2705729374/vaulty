/**
 * /oops — Branded error destination.
 *
 * The Edge middleware redirects here if its try-catch fires, replacing Vercel's
 * raw "500: INTERNAL_SERVER_ERROR / MIDDLEWARE_INVOCATION_FAILED" screen.
 * Also used as a general-purpose server-error page.
 *
 * Public route — intentionally NOT in PROTECTED_PATHS — always reachable,
 * even when the user's session is invalid or missing.
 */
import Link from "next/link"
import ReloadButton from "./ReloadButton"

export const metadata = {
  title: "Something went wrong — Vaultly",
}

export default function OopsPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center"
      style={{ background: "var(--color-page, #0A0A0F)" }}
    >
      {/* Lock icon */}
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
        An unexpected error occurred on our end. Don&apos;t worry — your journal
        entries are encrypted and completely unaffected.
      </p>
      <p
        className="text-sm mb-10"
        style={{ color: "var(--color-ink-faint, #555570)" }}
      >
        Please try again in a moment.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background: "var(--color-accent, #2563EB)",
            color: "#ffffff",
          }}
        >
          Return home
        </Link>
        <ReloadButton />
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
