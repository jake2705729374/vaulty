"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTheme } from "@/components/ThemeProvider"

type ColorTheme = "PARCHMENT" | "SLATE" | "ROSE" | "FOREST" | "MIDNIGHT"
type DarkMode = "SYSTEM" | "LIGHT" | "DARK"

const THEMES: {
  value: ColorTheme
  label: string
  bg: string
  accent: string
}[] = [
  { value: "PARCHMENT", label: "Parchment", bg: "#faf7f2", accent: "#92400e" },
  { value: "SLATE",     label: "Slate",     bg: "#f8fafc", accent: "#475569" },
  { value: "ROSE",      label: "Rose",      bg: "#fff5f5", accent: "#be123c" },
  { value: "FOREST",    label: "Forest",    bg: "#f0fdf4", accent: "#166534" },
  { value: "MIDNIGHT",  label: "Midnight",  bg: "#f5f3ff", accent: "#6d28d9" },
]

const DARK_MODES: { value: DarkMode; label: string }[] = [
  { value: "SYSTEM", label: "System" },
  { value: "LIGHT",  label: "Light" },
  { value: "DARK",   label: "Dark" },
]

export default function SettingsPage() {
  const { status } = useSession()
  const router = useRouter()
  const { colorTheme, darkMode, setColorTheme, setDarkMode } = useTheme()

  const [displayName, setDisplayName] = useState("")
  const [savedVisible, setSavedVisible] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  // Fetch initial preferences
  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/user/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        if (data.displayName) setDisplayName(data.displayName)
      })
      .catch(() => {})
  }, [status])

  const showSaved = useCallback(() => {
    setSavedVisible(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSavedVisible(false), 2000)
  }, [])

  const schedulePatch = useCallback(
    (patch: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/user/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          })
          if (res.ok) showSaved()
        } catch {
          // silently ignore
        }
      }, 800)
    },
    [showSaved],
  )

  function handleDisplayNameChange(value: string) {
    setDisplayName(value)
    schedulePatch({ displayName: value || null })
  }

  async function handleThemeChange(theme: ColorTheme) {
    // Optimistic — ThemeProvider handles the attribute update
    await setColorTheme(theme)
    showSaved()
  }

  async function handleDarkModeChange(mode: DarkMode) {
    await setDarkMode(mode)
    showSaved()
  }

  if (status === "loading") return null

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-lg mx-auto min-h-screen bg-surface shadow-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-theme">
          <Link
            href="/journal"
            className="text-sm text-ink-muted hover:text-ink transition-colors"
          >
            ← Journal
          </Link>
          <h1 className="text-base font-serif font-semibold text-ink">Settings</h1>
          <div className="w-12 flex justify-end">
            <span
              className="text-xs text-accent transition-opacity duration-300"
              style={{ opacity: savedVisible ? 1 : 0 }}
              aria-live="polite"
            >
              Saved ✓
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          {/* Display name */}
          <section>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 rounded-lg border bg-surface text-ink text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                outlineColor: "var(--color-accent)",
              }}
            />
          </section>

          {/* Theme swatches */}
          <section>
            <p className="text-sm font-medium text-ink-muted mb-3">Theme</p>
            <div className="flex gap-4 flex-wrap">
              {THEMES.map((t) => {
                const isSelected = colorTheme === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => handleThemeChange(t.value)}
                    aria-label={t.label}
                    title={t.label}
                    className="flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <span
                      className="w-10 h-10 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: t.bg,
                        borderColor: isSelected ? t.accent : "transparent",
                        boxShadow: isSelected
                          ? `0 0 0 2px ${t.accent}`
                          : "0 0 0 1px #d1d5db",
                      }}
                    >
                      <span
                        className="flex items-center justify-center w-full h-full"
                        style={{ color: t.accent, fontSize: "1rem", lineHeight: 1 }}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: isSelected ? "var(--color-ink)" : "var(--color-ink-muted)",
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {t.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Dark mode toggle */}
          <section>
            <p className="text-sm font-medium text-ink-muted mb-3">Appearance</p>
            <div
              className="inline-flex rounded-lg border overflow-hidden"
              style={{ borderColor: "var(--color-border)" }}
            >
              {DARK_MODES.map((m) => {
                const isActive = darkMode === m.value
                return (
                  <button
                    key={m.value}
                    onClick={() => handleDarkModeChange(m.value)}
                    className="px-4 py-2 text-sm font-medium transition-colors focus:outline-none"
                    style={{
                      backgroundColor: isActive
                        ? "var(--color-accent)"
                        : "var(--color-surface)",
                      color: isActive ? "#ffffff" : "var(--color-ink-muted)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "var(--color-surface)"
                      }
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
