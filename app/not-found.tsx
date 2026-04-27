/**
 * app/not-found.tsx — Custom 404 page.
 *
 * Rendered by Next.js whenever notFound() is called or a route has no match.
 * Renders inside the root layout, so CSS variables and fonts are available.
 */
import Link from "next/link"

export const metadata = {
  title: "Page not found — Vaultly",
}

export default function NotFound() {
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
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* 404 badge */}
      <span
        className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 px-3 py-1 rounded-full"
        style={{
          background: "var(--color-surface-2, #1a1a26)",
          color: "var(--color-ink-muted, #8b8ba7)",
          border: "1px solid var(--color-border, #272736)",
        }}
      >
        404
      </span>

      <h1
        className="text-3xl font-bold tracking-tight mb-3"
        style={{
          fontFamily: "var(--font-sora, system-ui)",
          color: "var(--color-ink, #f0f0f0)",
        }}
      >
        Page not found
      </h1>

      <p
        className="text-base max-w-sm leading-relaxed mb-10"
        style={{ color: "var(--color-ink-muted, #8b8ba7)" }}
      >
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
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
        <Link
          href="/journal"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
          style={{
            background: "var(--color-surface-2, #1a1a26)",
            border: "1px solid var(--color-border, #272736)",
            color: "var(--color-ink, #f0f0f0)",
          }}
        >
          Open journal
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
