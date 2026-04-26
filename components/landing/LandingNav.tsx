"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

const links = [
  { label: "Features",     href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Reviews",      href: "#reviews" },
]

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4">
      <nav
        className="w-full max-w-5xl flex items-center justify-between px-5 py-3 rounded-2xl transition-all duration-300"
        style={{
          background: scrolled
            ? "rgba(10,10,15,0.85)"
            : "rgba(10,10,15,0.4)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: scrolled
            ? "0 4px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)"
            : "none",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
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

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#2563EB")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "#8B8BA7")
                }
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="hidden md:block text-sm font-medium transition-colors duration-200"
            style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#2563EB")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8B8BA7")}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 animate-glow-pulse"
            style={{
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              color: "#fff",
              fontFamily: "var(--font-inter)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            Get Started
          </Link>

          {/* Mobile burger */}
          <button
            className="md:hidden p-1"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span style={{ color: "#F0F0F0", fontSize: 20 }}>
              {menuOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="absolute top-[72px] inset-x-4 rounded-2xl p-5 flex flex-col gap-4 md:hidden"
          style={{
            background: "rgba(10,10,15,0.97)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium"
              style={{ color: "#F0F0F0", fontFamily: "var(--font-inter)" }}
            >
              {l.label}
            </a>
          ))}
          <hr style={{ borderColor: "rgba(255,255,255,0.08)" }} />
          <Link
            href="/login"
            className="text-sm font-medium"
            style={{ color: "#8B8BA7" }}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold px-4 py-2 rounded-lg text-center"
            style={{ background: "#2563EB", color: "#fff" }}
          >
            Get Started
          </Link>
        </div>
      )}
    </header>
  )
}
