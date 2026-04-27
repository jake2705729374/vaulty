"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"

type ColorTheme = "PARCHMENT" | "SLATE" | "ROSE" | "FOREST" | "MIDNIGHT" | "VAULT" | "CUSTOM"
type DarkMode   = "SYSTEM" | "LIGHT" | "DARK"

interface CustomColors { accent: string; page: string }

interface ThemeContextValue {
  colorTheme:     ColorTheme
  darkMode:       DarkMode
  customColors:   CustomColors | null
  setColorTheme:  (theme: ColorTheme) => Promise<void>
  setDarkMode:    (mode: DarkMode)    => Promise<void>
  setCustomTheme: (accent: string, page: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// ── Pure hex helpers ────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0"))
    .join("")
}
function shift(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + delta, g + delta, b + delta)
}
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function deriveTheme(accent: string, page: string) {
  const lum  = luminance(page)
  const dark = lum < 0.3
  return {
    page,
    surface:     dark ? shift(page, 10) : "#ffffff",
    surface2:    dark ? shift(page, 20) : shift(page, -8),
    border:      dark ? shift(page, 35) : shift(page, -18),
    accent,
    accentHover: dark ? shift(accent, 18) : shift(accent, -12),
    ink:         dark ? "#f0f0f0" : "#1c1917",
    inkMuted:    dark ? "#8b8ba7" : "#78716c",
    inkFaint:    dark ? "#555570" : "#a8a29e",
  }
}

const CUSTOM_PROPS = [
  "--color-page", "--color-surface", "--color-surface-2", "--color-border",
  "--color-accent", "--color-accent-hover",
  "--color-ink", "--color-ink-muted", "--color-ink-faint",
]

// ── VAULT colour palettes ────────────────────────────────────────────────
// Inline styles beat the CSS cascade, so we inject them directly.
// Two palettes so VAULT honours the Appearance (Light / Dark / System) toggle.

const VAULT_DARK = {
  page:        "#0A0A0F",
  surface:     "#111118",
  surface2:    "#1a1a26",
  border:      "#272736",
  accent:      "#2563EB",
  accentHover: "#3b82f6",
  ink:         "#f0f0f0",
  inkMuted:    "#8b8ba7",
  inkFaint:    "#555570",
}

const VAULT_LIGHT = {
  page:        "#f4f7ff",
  surface:     "#ffffff",
  surface2:    "#eef2ff",
  border:      "#d1dff7",
  accent:      "#2563EB",
  accentHover: "#1d4ed8",
  ink:         "#0f172a",
  inkMuted:    "#4b607f",
  inkFaint:    "#94a7c5",
}

/** Resolve "SYSTEM" to the actual OS preference at call time. */
function resolveMode(darkMode: DarkMode): "dark" | "light" {
  if (darkMode === "SYSTEM") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return darkMode.toLowerCase() as "dark" | "light"
}

function applyVaultTheme(resolvedMode: "dark" | "light" = "dark") {
  const c    = resolvedMode === "light" ? VAULT_LIGHT : VAULT_DARK
  const root = document.documentElement
  root.setAttribute("data-theme", "vault")
  root.setAttribute("data-dark",  resolvedMode)
  root.style.setProperty("--color-page",         c.page)
  root.style.setProperty("--color-surface",       c.surface)
  root.style.setProperty("--color-surface-2",     c.surface2)
  root.style.setProperty("--color-border",        c.border)
  root.style.setProperty("--color-accent",        c.accent)
  root.style.setProperty("--color-accent-hover",  c.accentHover)
  root.style.setProperty("--color-ink",           c.ink)
  root.style.setProperty("--color-ink-muted",     c.inkMuted)
  root.style.setProperty("--color-ink-faint",     c.inkFaint)
}

function applyCustomTheme(accent: string, page: string) {
  const t = deriveTheme(accent, page)
  const root = document.documentElement
  root.setAttribute("data-theme", "custom")
  root.style.setProperty("--color-page",         t.page)
  root.style.setProperty("--color-surface",       t.surface)
  root.style.setProperty("--color-surface-2",     t.surface2)
  root.style.setProperty("--color-border",        t.border)
  root.style.setProperty("--color-accent",        t.accent)
  root.style.setProperty("--color-accent-hover",  t.accentHover)
  root.style.setProperty("--color-ink",           t.ink)
  root.style.setProperty("--color-ink-muted",     t.inkMuted)
  root.style.setProperty("--color-ink-faint",     t.inkFaint)
}

function clearCustomTheme() {
  const root = document.documentElement
  CUSTOM_PROPS.forEach((p) => root.style.removeProperty(p))
}

function syncCustomToStorage(accent: string, page: string) {
  try { localStorage.setItem("journal-theme-custom", JSON.stringify({ accent, page })) } catch { /* */ }
}

function applyThemeAttributes(colorTheme: ColorTheme, darkMode: DarkMode) {
  // VAULT and CUSTOM are handled via inline styles — skip them here.
  if (colorTheme === "CUSTOM" || colorTheme === "VAULT") return
  const root = document.documentElement
  root.setAttribute("data-theme", colorTheme.toLowerCase())
  let resolved: "dark" | "light"
  if (darkMode === "SYSTEM") {
    resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  } else {
    resolved = darkMode.toLowerCase() as "dark" | "light"
  }
  root.setAttribute("data-dark", resolved)
}

function syncToLocalStorage(colorTheme: ColorTheme, darkMode: DarkMode) {
  try {
    localStorage.setItem("journal-theme", colorTheme.toLowerCase())
    localStorage.setItem("journal-dark",  darkMode.toLowerCase())
  } catch { /* */ }
}

// ── Provider ─────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children?: React.ReactNode }) {
  const { data: session } = useSession()
  const [colorTheme,   setColorThemeState]   = useState<ColorTheme>("VAULT")
  const [darkMode,     setDarkModeState]     = useState<DarkMode>("SYSTEM")
  const [customColors, setCustomColorsState] = useState<CustomColors | null>(null)

  // Fetch preferences on auth
  useEffect(() => {
    if (!session?.user?.id) return
    fetch("/api/user/preferences")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        const theme: ColorTheme = data.colorTheme ?? "VAULT"
        const mode:  DarkMode   = data.darkMode   ?? "SYSTEM"
        setColorThemeState(theme)
        setDarkModeState(mode)

        if (theme === "CUSTOM" && data.customTheme) {
          try {
            const c: CustomColors = JSON.parse(data.customTheme)
            setCustomColorsState(c)
            applyCustomTheme(c.accent, c.page)
            syncCustomToStorage(c.accent, c.page)
          } catch { /* */ }
        } else if (theme === "VAULT") {
          clearCustomTheme()
          applyVaultTheme(resolveMode(mode))
          syncToLocalStorage(theme, mode)
        } else {
          clearCustomTheme()
          applyThemeAttributes(theme, mode)
          syncToLocalStorage(theme, mode)
        }
      })
      .catch(() => { /* keep defaults */ })
  }, [session?.user?.id])

  // Re-apply whenever theme or mode changes (non-custom, non-vault handled here too)
  useEffect(() => {
    if (colorTheme === "VAULT") {
      applyVaultTheme(resolveMode(darkMode))
    } else if (colorTheme !== "CUSTOM") {
      applyThemeAttributes(colorTheme, darkMode)
    }
  }, [colorTheme, darkMode])

  // System dark-mode OS listener — keep in sync for both VAULT and CSS-driven themes
  useEffect(() => {
    if (darkMode !== "SYSTEM") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light"
      if (colorTheme === "VAULT") {
        applyVaultTheme(resolved)
      } else {
        document.documentElement.setAttribute("data-dark", resolved)
      }
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [darkMode, colorTheme])

  const setColorTheme = useCallback(async (theme: ColorTheme) => {
    clearCustomTheme()
    setColorThemeState(theme)
    if (theme === "VAULT") {
      applyVaultTheme(resolveMode(darkMode))
      syncToLocalStorage(theme, darkMode)
    } else if (theme !== "CUSTOM") {
      document.documentElement.setAttribute("data-theme", theme.toLowerCase())
      syncToLocalStorage(theme, darkMode)
    }
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colorTheme: theme }),
    })
  }, [darkMode])

  const setDarkMode = useCallback(async (mode: DarkMode) => {
    setDarkModeState(mode)
    const resolved: "dark" | "light" =
      mode === "SYSTEM"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : (mode.toLowerCase() as "dark" | "light")

    if (colorTheme === "VAULT") {
      applyVaultTheme(resolved)
    } else {
      document.documentElement.setAttribute("data-dark", resolved)
    }

    syncToLocalStorage(colorTheme, mode)
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode: mode }),
    })
  }, [colorTheme])

  const setCustomTheme = useCallback(async (accent: string, page: string) => {
    const colors: CustomColors = { accent, page }
    setCustomColorsState(colors)
    setColorThemeState("CUSTOM")
    applyCustomTheme(accent, page)
    syncCustomToStorage(accent, page)
    syncToLocalStorage("CUSTOM", darkMode)
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        colorTheme:  "CUSTOM",
        customTheme: JSON.stringify(colors),
      }),
    })
  }, [darkMode])

  return (
    <ThemeContext.Provider value={{ colorTheme, darkMode, customColors, setColorTheme, setDarkMode, setCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
