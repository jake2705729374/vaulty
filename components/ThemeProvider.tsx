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

// VAULT: hardcoded exact values — injected as inline styles to beat CSS cascade
const VAULT_COLORS = {
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

function applyVaultTheme() {
  const root = document.documentElement
  root.setAttribute("data-theme", "vault")
  root.style.setProperty("--color-page",         VAULT_COLORS.page)
  root.style.setProperty("--color-surface",       VAULT_COLORS.surface)
  root.style.setProperty("--color-surface-2",     VAULT_COLORS.surface2)
  root.style.setProperty("--color-border",        VAULT_COLORS.border)
  root.style.setProperty("--color-accent",        VAULT_COLORS.accent)
  root.style.setProperty("--color-accent-hover",  VAULT_COLORS.accentHover)
  root.style.setProperty("--color-ink",           VAULT_COLORS.ink)
  root.style.setProperty("--color-ink-muted",     VAULT_COLORS.inkMuted)
  root.style.setProperty("--color-ink-faint",     VAULT_COLORS.inkFaint)
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
  if (colorTheme === "CUSTOM" || colorTheme === "VAULT") return // handled via inline styles
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
          applyVaultTheme()
          syncToLocalStorage(theme, mode)
        } else {
          clearCustomTheme()
          applyThemeAttributes(theme, mode)
          syncToLocalStorage(theme, mode)
        }
      })
      .catch(() => { /* keep defaults */ })
  }, [session?.user?.id])

  // Sync on change (non-custom, non-vault)
  useEffect(() => {
    if (colorTheme !== "CUSTOM" && colorTheme !== "VAULT") {
      applyThemeAttributes(colorTheme, darkMode)
    }
  }, [colorTheme, darkMode])

  // System dark mode listener
  useEffect(() => {
    if (darkMode !== "SYSTEM") return
    const mq      = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) =>
      document.documentElement.setAttribute("data-dark", e.matches ? "dark" : "light")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [darkMode])

  const setColorTheme = useCallback(async (theme: ColorTheme) => {
    clearCustomTheme()
    setColorThemeState(theme)
    if (theme === "VAULT") {
      applyVaultTheme()
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
    let resolved: "dark" | "light"
    if (mode === "SYSTEM") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } else {
      resolved = mode.toLowerCase() as "dark" | "light"
    }
    document.documentElement.setAttribute("data-dark", resolved)
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
