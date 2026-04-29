"use client"

/**
 * app/not-found.tsx — Custom 404 page.
 *
 * Rendered by Next.js whenever notFound() is called or a route has no match.
 * Renders inside the root layout so CSS variables and fonts are available.
 */
import Link from "next/link"

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
        className="inline-block text-xs font-inter font-semibold tracking-widest uppercase mb-4 px-3 py-1 rounded-full"
        style={{
          background: "var(--color-surface-2, #1a1a26)",
          color: "var(--color-ink-muted, #8b8ba7)",
          border: "1px solid var(--color-border, #272736)",
        }}
      >
        404
      </span>

      <h1
        className="text-3xl font-sora font-bold tracking-tight mb-3"
        style={{ color: "var(--color-ink, #f0f0f0)" }}
      >
        Page not found
      </h1>

      <p
        className="font-inter text-base max-w-sm leading-relaxed mb-10"
        style={{ color: "var(--color-ink-muted, #8b8ba7)" }}
      >
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      {/* Buttons — full-width, equal size, centered */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mx-auto">
        <Link
          href="/"
          className="flex-1 inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-inter font-semibold transition-all duration-150"
          style={{
            background: "var(--color-accent, #2563EB)",
            color: "#ffffff",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.88"
            e.currentTarget.style.transform = "translateY(-1px)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1"
            e.currentTarget.style.transform = "translateY(0)"
          }}
          onMouseDown={(e)  => { e.currentTarget.style.transform = "scale(0.97)" }}
          onMouseUp={(e)    => { e.currentTarget.style.transform = "translateY(-1px)" }}
        >
          Return home
        </Link>
        <Link
          href="/journal"
          className="flex-1 inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-inter font-medium transition-all duration-150"
          style={{
            background: "var(--color-surface-2, #1a1a26)",
            border: "1px solid var(--color-border, #272736)",
            color: "var(--color-ink, #f0f0f0)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background  = "var(--color-surface, #16161f)"
            e.currentTarget.style.borderColor = "var(--color-ink-faint, #555570)"
            e.currentTarget.style.transform   = "translateY(-1px)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background  = "var(--color-surface-2, #1a1a26)"
            e.currentTarget.style.borderColor = "var(--color-border, #272736)"
            e.currentTarget.style.transform   = "translateY(0)"
          }}
          onMouseDown={(e)  => { e.currentTarget.style.transform = "scale(0.97)" }}
          onMouseUp={(e)    => { e.currentTarget.style.transform = "translateY(-1px)" }}
        >
          Open journal
        </Link>
      </div>

      <p
        className="mt-16 text-xs font-inter"
        style={{ color: "var(--color-ink-faint, #555570)" }}
      >
        Vaultly · Your data is always encrypted
      </p>
    </div>
  )
}
