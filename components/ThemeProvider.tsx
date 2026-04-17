"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"

type ColorTheme = "PARCHMENT" | "SLATE" | "ROSE" | "FOREST" | "MIDNIGHT"
type DarkMode = "SYSTEM" | "LIGHT" | "DARK"

interface ThemeContextValue {
  colorTheme: ColorTheme
  darkMode: DarkMode
  setColorTheme: (theme: ColorTheme) => Promise<void>
  setDarkMode: (mode: DarkMode) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyThemeAttributes(colorTheme: ColorTheme, darkMode: DarkMode) {
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
    localStorage.setItem("journal-dark", darkMode.toLowerCase())
  } catch {
    // localStorage may be unavailable in some environments
  }
}

export function ThemeProvider({ children }: { children?: React.ReactNode }) {
  const { data: session } = useSession()
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("PARCHMENT")
  const [darkMode, setDarkModeState] = useState<DarkMode>("SYSTEM")

  // Fetch preferences when authenticated
  useEffect(() => {
    if (!session?.user?.id) return

    fetch("/api/user/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        const theme: ColorTheme = data.colorTheme ?? "PARCHMENT"
        const mode: DarkMode = data.darkMode ?? "SYSTEM"
        setColorThemeState(theme)
        setDarkModeState(mode)
        applyThemeAttributes(theme, mode)
        syncToLocalStorage(theme, mode)
      })
      .catch(() => {
        // Silently ignore — keep defaults applied by the blocking script
      })
  }, [session?.user?.id])

  // Apply attributes whenever colorTheme or darkMode changes
  useEffect(() => {
    applyThemeAttributes(colorTheme, darkMode)
  }, [colorTheme, darkMode])

  // System dark mode listener
  useEffect(() => {
    if (darkMode !== "SYSTEM") return

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-dark", e.matches ? "dark" : "light")
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [darkMode])

  const setColorTheme = useCallback(
    async (theme: ColorTheme) => {
      // Optimistic update
      setColorThemeState(theme)
      document.documentElement.setAttribute("data-theme", theme.toLowerCase())
      syncToLocalStorage(theme, darkMode)

      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorTheme: theme }),
      })
    },
    [darkMode],
  )

  const setDarkMode = useCallback(
    async (mode: DarkMode) => {
      // Optimistic update
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
    },
    [colorTheme],
  )

  return (
    <ThemeContext.Provider value={{ colorTheme, darkMode, setColorTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return ctx
}
