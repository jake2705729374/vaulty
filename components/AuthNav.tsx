"use client"

import Link from "next/link"

// ── AuthNav ───────────────────────────────────────────────────────────────
// Slim top bar shared by /login and /register.
// Contextual right-side CTA swaps between the two pages.
interface AuthNavProps {
  page: "login" | "register"
}

export default function AuthNav({ page }: AuthNavProps) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-5 md:px-8"
      style={{
        background:     "rgba(10,10,15,0.82)",
        backdropFilter: "blur(16px)",
        borderBottom:   "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Wordmark */}
      <Link href="/" className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}
        >
          V
        </div>
        <span
          className="text-base font-bold tracking-tight"
          style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
        >
          Vaultly
        </span>
      </Link>

      <div className="flex-1" />

      {/* Right-side links */}
      <div className="flex items-center gap-2">
        {/* Home button */}
        <Link
          href="/"
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
          style={{
            color:      "#93B4FF",
            background: "rgba(37,99,235,0.10)",
            border:     "1px solid rgba(37,99,235,0.25)",
            fontFamily: "var(--font-inter)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background  = "rgba(37,99,235,0.20)"
            e.currentTarget.style.borderColor = "rgba(37,99,235,0.50)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background  = "rgba(37,99,235,0.10)"
            e.currentTarget.style.borderColor = "rgba(37,99,235,0.25)"
          }}
        >
          Home
        </Link>

        {page === "login" ? (
          <Link
            href="/register"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color:      "#93B4FF",
              background: "rgba(37,99,235,0.10)",
              border:     "1px solid rgba(37,99,235,0.25)",
              fontFamily: "var(--font-inter)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background    = "rgba(37,99,235,0.20)"
              e.currentTarget.style.borderColor   = "rgba(37,99,235,0.50)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background    = "rgba(37,99,235,0.10)"
              e.currentTarget.style.borderColor   = "rgba(37,99,235,0.25)"
            }}
          >
            Create account
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color:      "#93B4FF",
              background: "rgba(37,99,235,0.10)",
              border:     "1px solid rgba(37,99,235,0.25)",
              fontFamily: "var(--font-inter)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background    = "rgba(37,99,235,0.20)"
              e.currentTarget.style.borderColor   = "rgba(37,99,235,0.50)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background    = "rgba(37,99,235,0.10)"
              e.currentTarget.style.borderColor   = "rgba(37,99,235,0.25)"
            }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
