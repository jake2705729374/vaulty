"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTheme } from "@/components/ThemeProvider"
import { BirthdayPicker } from "@/components/BirthdayPicker"
import PageTransition from "@/components/PageTransition"
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter"
import { QUOTE_CATEGORIES } from "@/lib/quotes"
import { unlockMek, rewrapMek, type KeyBundle } from "@/lib/crypto"
import { getPasswordStrength } from "@/lib/password-strength"

type ColorTheme = "PARCHMENT" | "SLATE" | "ROSE" | "FOREST" | "MIDNIGHT" | "VAULT" | "CUSTOM"
type DarkMode = "SYSTEM" | "LIGHT" | "DARK"
type Relationship = "Friend" | "Partner" | "Family" | "Colleague"

interface CoachPerson {
  name:         string
  relationship: string    // "Friend", "Mother", "Father", etc.
  birthday?:    string    // "MM/DD"
  closeness?:   string    // "very_close" | "close" | "complicated"
  traits?:      string[]
  notes?:       string
}

const THEMES: {
  value: ColorTheme
  label: string
  bg: string
  accent: string
}[] = [
  { value: "VAULT",     label: "Default",   bg: "#0A0A0F", accent: "#2563EB" },
  { value: "PARCHMENT", label: "Parchment", bg: "#faf7f2", accent: "#92400e" },
  { value: "SLATE",     label: "Slate",     bg: "#f8fafc", accent: "#475569" },
  { value: "ROSE",      label: "Rose",      bg: "#fff5f5", accent: "#be123c" },
  { value: "FOREST",    label: "Forest",    bg: "#f0fdf4", accent: "#166534" },
  { value: "MIDNIGHT",  label: "Midnight",  bg: "#f5f3ff", accent: "#6d28d9" },
]

const PRESET_ACCENTS = [
  "#2563EB", "#7c3aed", "#dc2626", "#059669",
  "#d97706", "#db2777", "#0891b2", "#ea580c",
]

const PRESET_PAGES = [
  "#0A0A0F", "#0f172a", "#1a1a2e", "#111827", "#1c1917", "#ffffff",
]

const DARK_MODES: { value: DarkMode; label: string }[] = [
  { value: "SYSTEM", label: "System" },
  { value: "LIGHT",  label: "Light" },
  { value: "DARK",   label: "Dark" },
]

const COACH_RELATIONSHIPS: Relationship[] = ["Friend", "Partner", "Family", "Colleague"]

const FAMILY_SUB_TYPES = [
  "Mother", "Father", "Sister", "Brother",
  "Grandparent", "Aunt/Uncle", "Cousin", "Other",
]

const PERSON_TRAITS = [
  "Supportive", "Funny", "Caring", "Ambitious", "Sensitive",
  "Direct", "Creative", "Adventurous", "Reserved", "Loyal", "Energetic", "Analytical",
]

const CLOSENESS_LEVELS = [
  { value: "very_close",  label: "Very close"   },
  { value: "close",       label: "Close"        },
  { value: "complicated", label: "Complicated"  },
]

const COACH_LIFE_PHASES = [
  "Student", "Professional", "Parent", "Caregiver", "Major Transition", "Retired",
]

const COACH_SITUATIONS = [
  "New job", "Breakup", "Grief", "Health journey",
  "Celebration", "Stress", "Major decision", "Relationship change",
]

const GOALS_LIST = [
  { id: "mental_clarity",      label: "Mental clarity",      sub: "Clear mind, better thinking"    },
  { id: "emotional_wellbeing", label: "Emotional wellbeing", sub: "Process feelings, reduce stress" },
  { id: "personal_growth",     label: "Personal growth",     sub: "Track progress, set intentions"  },
  { id: "creativity",          label: "Creativity",          sub: "Capture ideas and inspiration"   },
  { id: "gratitude",           label: "Gratitude",           sub: "Build a daily gratitude habit"   },
  { id: "habit_tracking",      label: "Habit tracking",      sub: "Stay consistent with your goals" },
]

// ── SectionCard must live OUTSIDE SettingsPage.
// If defined inside, React treats it as a brand-new component type on every
// parent render → full unmount/remount of every card → page scrolls to top.
function SectionCard({
  title, icon, children, id, open, onToggle,
}: {
  title:    string
  icon?:    React.ReactNode
  children: React.ReactNode
  id?:      string
  open:     boolean
  onToggle: () => void
}) {
  return (
    <div id={id} className="rounded-2xl bg-surface" style={{ border: "1px solid var(--color-border)" }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-inter font-semibold text-ink-faint uppercase tracking-widest">{title}</span>
        </div>
        <svg
          viewBox="0 0 20 20" fill="currentColor" width="14" height="14"
          style={{
            color: "var(--color-ink-faint)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      <div style={{ display: open ? "block" : "none" }}>
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { status } = useSession()
  const router = useRouter()
  const { colorTheme, darkMode, customColors, setColorTheme, setDarkMode, setCustomTheme } = useTheme()

  const [displayName, setDisplayName] = useState("")
  const [goals,       setGoals]       = useState<string[]>([])
  const [quoteCats,   setQuoteCats]   = useState<string[]>([])
  const [savedVisible, setSavedVisible] = useState(false)
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Collapsible sections state — all open by default except Saved Memories
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["savedMemories"]))
  function toggleSection(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function isCollapsed(key: string) { return collapsed.has(key) }

  // Local custom color state for the picker (synced from customColors)
  const [pickerAccent, setPickerAccent] = useState(customColors?.accent ?? "#2563EB")
  const [pickerPage,   setPickerPage]   = useState(customColors?.page   ?? "#0A0A0F")

  // Coach profile state
  const [coachPeople,         setCoachPeople]         = useState<CoachPerson[]>([])
  const [newCoachName,        setNewCoachName]        = useState("")
  const [newCoachRel,         setNewCoachRel]         = useState<Relationship>("Friend")
  const [newCoachFamSub,      setNewCoachFamSub]      = useState("Mother")
  const [newCoachFamOther,    setNewCoachFamOther]    = useState("")
  const [expandedPersonIdx,   setExpandedPersonIdx]   = useState<number | null>(null)
  const [coachLifePhase,      setCoachLifePhase]      = useState<string | null>(null)
  const [coachSituations,     setCoachSituations]     = useState<string[]>([])
  const [coachContextEnabled, setCoachContextEnabled] = useState(false)
  const [showPrivacyModal,    setShowPrivacyModal]    = useState(false)
  // Bio + style
  const [userBio,     setUserBio]     = useState("")
  const [coachStyle,  setCoachStyle]  = useState("balanced")
  // Weekly digest
  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestDay,     setDigestDay]     = useState("sunday")
  // Memories
  const [memories,       setMemories]       = useState<{ id: string; content: string; createdAt: string }[]>([])
  const [memoriesLoaded, setMemoriesLoaded] = useState(false)

  // Password change
  const [pwCurrent,    setPwCurrent]    = useState("")
  const [pwNew,        setPwNew]        = useState("")
  const [pwConfirm,    setPwConfirm]    = useState("")
  const [pwChanging,   setPwChanging]   = useState(false)
  const [pwError,      setPwError]      = useState("")
  const [pwSuccess,    setPwSuccess]    = useState(false)
  const [pwShow,       setPwShow]       = useState([false, false, false])

  // Account deletion
  const [showDeleteModal,  setShowDeleteModal]  = useState(false)
  const [deletePassword,   setDeletePassword]   = useState("")
  const [deleteLoading,    setDeleteLoading]    = useState(false)
  const [deleteError,      setDeleteError]      = useState("")
  const [deleteShowPw,     setDeleteShowPw]     = useState(false)

  // Sync picker state when customColors changes (e.g. on initial load)
  useEffect(() => {
    if (customColors) {
      setPickerAccent(customColors.accent)
      setPickerPage(customColors.page)
    }
  }, [customColors])

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
        if (data.journalingGoals) {
          try { setGoals(JSON.parse(data.journalingGoals)) } catch { /* */ }
        }
        if (data.quoteCategories) {
          try { setQuoteCats(JSON.parse(data.quoteCategories)) } catch { /* */ }
        }
        // Coach profile
        setCoachContextEnabled(Boolean(data.coachContextEnabled))
        if (data.coachPeople) {
          try { setCoachPeople(JSON.parse(data.coachPeople)) } catch { /* */ }
        }
        if (data.coachLifeContext) {
          try {
            const ctx = JSON.parse(data.coachLifeContext)
            if (ctx.phase)      setCoachLifePhase(ctx.phase)
            if (ctx.situations) setCoachSituations(ctx.situations)
          } catch { /* */ }
        }
        if (data.userBio)    setUserBio(data.userBio)
        if (data.coachStyle) setCoachStyle(data.coachStyle)
        setDigestEnabled(Boolean(data.digestEnabled))
        if (data.digestDay)  setDigestDay(data.digestDay)
      })
      .catch(() => {})

    // Load memories
    fetch("/api/memories")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.memories) setMemories(data.memories)
        setMemoriesLoaded(true)
      })
      .catch(() => setMemoriesLoaded(true))
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
    await setColorTheme(theme)
    showSaved()
  }

  async function handleDarkModeChange(mode: DarkMode) {
    await setDarkMode(mode)
    showSaved()
  }

  async function handleAccentChange(accent: string) {
    setPickerAccent(accent)
    await setCustomTheme(accent, pickerPage)
    showSaved()
  }

  async function handlePageChange(page: string) {
    setPickerPage(page)
    await setCustomTheme(pickerAccent, page)
    showSaved()
  }

  function toggleGoal(id: string) {
    const next = goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id]
    setGoals(next)
    schedulePatch({ journalingGoals: JSON.stringify(next) })
  }

  function toggleQuoteCat(id: string) {
    const next = quoteCats.includes(id) ? quoteCats.filter((c) => c !== id) : [...quoteCats, id]
    setQuoteCats(next)
    schedulePatch({ quoteCategories: JSON.stringify(next) })
  }

  // ── Coach profile helpers ─────────────────────────────────────────────────
  function getEffectiveCoachRel(): string {
    if (newCoachRel === "Family") {
      if (newCoachFamSub === "Other") return newCoachFamOther.trim() || "Family member"
      return newCoachFamSub
    }
    return newCoachRel
  }

  function addCoachPerson() {
    const trimmed = newCoachName.trim()
    if (!trimmed || coachPeople.length >= 8) return
    const next = [...coachPeople, { name: trimmed, relationship: getEffectiveCoachRel() }]
    setCoachPeople(next)
    setNewCoachName("")
    setNewCoachFamOther("")
    schedulePatch({ coachPeople: JSON.stringify(next) })
  }

  function removeCoachPerson(idx: number) {
    const next = coachPeople.filter((_, i) => i !== idx)
    setCoachPeople(next)
    if (expandedPersonIdx === idx) setExpandedPersonIdx(null)
    schedulePatch({ coachPeople: JSON.stringify(next) })
  }

  function updatePersonDetail(idx: number, field: string, value: unknown) {
    const next = coachPeople.map((p, i) => i === idx ? { ...p, [field]: value } : p)
    setCoachPeople(next)
    schedulePatch({ coachPeople: JSON.stringify(next) })
  }

  function togglePersonTrait(idx: number, trait: string) {
    const person = coachPeople[idx]
    const traits = person.traits ?? []
    const next = traits.includes(trait) ? traits.filter((t) => t !== trait) : [...traits, trait]
    updatePersonDetail(idx, "traits", next)
  }

  function toggleCoachSituation(s: string) {
    const next = coachSituations.includes(s)
      ? coachSituations.filter((x) => x !== s)
      : [...coachSituations, s]
    setCoachSituations(next)
    schedulePatch({ coachLifeContext: JSON.stringify({ phase: coachLifePhase, situations: next }) })
  }

  function handleCoachPhaseChange(phase: string) {
    const next = coachLifePhase === phase ? null : phase
    setCoachLifePhase(next)
    schedulePatch({ coachLifeContext: JSON.stringify({ phase: next, situations: coachSituations }) })
  }

  function handleCoachToggleAttempt() {
    if (coachContextEnabled) {
      // Turning OFF — save immediately
      setCoachContextEnabled(false)
      schedulePatch({ coachContextEnabled: false })
    } else {
      // Turning ON — show disclosure modal first
      setShowPrivacyModal(true)
    }
  }

  function confirmCoachContext() {
    setShowPrivacyModal(false)
    setCoachContextEnabled(true)
    schedulePatch({ coachContextEnabled: true })
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError("")
    setPwSuccess(false)

    if (!pwCurrent || !pwNew || !pwConfirm) { setPwError("All fields are required."); return }
    const newStrength = getPasswordStrength(pwNew)
    if (!newStrength.isAcceptable)           { setPwError(newStrength.isCommon ? "That password is too common. Choose something more unique." : "New password must meet at least 3 of the 4 requirements shown below."); return }
    if (pwNew !== pwConfirm)                 { setPwError("New passwords do not match."); return }
    if (pwNew === pwCurrent)                 { setPwError("New password must differ from the current one."); return }

    setPwChanging(true)
    try {
      // 1. Fetch the current key bundle so we can re-wrap the MEK
      const bundleRes = await fetch("/api/user/key-bundle")
      const bundle: KeyBundle | null = bundleRes.ok ? await bundleRes.json() : null

      if (!bundle) {
        setPwError("Encryption not yet initialised — open your journal first, then try again.")
        return
      }

      // 2. Unlock the MEK using the current password
      let mek: CryptoKey
      try {
        mek = await unlockMek(pwCurrent, bundle)
      } catch {
        setPwError("Current password is incorrect.")
        return
      }

      // 3. Re-wrap the MEK with the new password (entries stay untouched)
      const newBundle = await rewrapMek(mek, pwNew)

      // 4. Send current password + new bcrypt hash + new key bundle to server
      const res = await fetch("/api/user/password", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          currentPassword: pwCurrent,
          newPassword:     pwNew,
          ...newBundle,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setPwError((data as { error?: string }).error ?? "Password change failed. Please try again.")
        return
      }

      // 5. Update sessionStorage so the current session keeps working
      sessionStorage.setItem("masterPassword", pwNew)
      setPwSuccess(true)
      setPwCurrent("")
      setPwNew("")
      setPwConfirm("")
    } catch {
      setPwError("An unexpected error occurred. Please try again.")
    } finally {
      setPwChanging(false)
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    setDeleteError("")
    if (!deletePassword) { setDeleteError("Please enter your password."); return }

    setDeleteLoading(true)
    try {
      const res = await fetch("/api/user", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password: deletePassword }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError((data as { error?: string }).error ?? "Deletion failed. Please try again.")
        return
      }

      // Wipe local session data, clear auth cookies, then land on the goodbye page
      sessionStorage.removeItem("masterPassword")
      window.location.href = "/api/auth/logout?to=/account-deleted"
    } catch {
      setDeleteError("An unexpected error occurred. Please try again.")
    } finally {
      setDeleteLoading(false)
    }
  }

  const isCustom = colorTheme === "CUSTOM"

  if (status === "loading") return null

  return (
    <PageTransition>
      <div className="min-h-screen bg-page">

        {/* Sticky header */}
        <header
          className="sticky top-0 z-40 border-b border-theme"
          style={{ background: "var(--color-surface)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center justify-between px-4 md:px-8 h-14 max-w-screen-xl mx-auto">
            <Link
              href="/dashboard"
              className="text-sm font-inter text-ink-muted hover:text-ink transition-colors"
            >
              ← Home
            </Link>
            <h1 className="text-base font-sora font-semibold text-ink">Settings</h1>
            <div className="w-20 flex justify-end">
              <span
                className="text-xs text-accent transition-opacity duration-300"
                style={{ opacity: savedVisible ? 1 : 0 }}
                aria-live="polite"
              >
                Saved ✓
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

            {/* ── Left column ─────────────────────────────────────── */}
            <div className="space-y-6">

              {/* Display name */}
              <SectionCard title="Display name" open={!collapsed.has("displayName")} onToggle={() => toggleSection("displayName")}>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 rounded-lg border bg-surface text-ink text-sm font-inter focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "var(--color-border)",
                    outlineColor: "var(--color-accent)",
                  }}
                />
              </SectionCard>

              {/* Focus areas */}
              <SectionCard title="Focus areas" open={!collapsed.has("focusAreas")} onToggle={() => toggleSection("focusAreas")}>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS_LIST.map(({ id, label, sub }) => {
                    const selected = goals.includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleGoal(id)}
                        className="flex flex-col gap-1.5 p-3 rounded-xl text-left transition-all duration-150"
                        style={{
                          background: selected ? "var(--color-surface-2)" : "transparent",
                          border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-inter font-semibold leading-snug" style={{ color: selected ? "var(--color-ink)" : "var(--color-ink-muted)" }}>
                            {label}
                          </p>
                          {selected && (
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <p className="text-[10px] font-inter leading-tight" style={{ color: "var(--color-ink-faint)" }}>
                          {sub}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </SectionCard>

              {/* Quote preferences */}
              <SectionCard title="Quote preferences" open={!collapsed.has("quotePrefs")} onToggle={() => toggleSection("quotePrefs")}>
                <p className="text-xs font-inter text-ink-faint mb-3">
                  Select categories to personalise your daily quote.
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUOTE_CATEGORIES.map(({ id, label }) => {
                    const selected = quoteCats.includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleQuoteCat(id)}
                        className="px-3 py-1.5 rounded-full text-xs font-inter font-medium transition-all duration-150"
                        style={{
                          background: selected ? "var(--color-accent)" : "var(--color-surface-2)",
                          border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                          color: selected ? "#ffffff" : "var(--color-ink-muted)",
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </SectionCard>

              {/* Coach Profile */}
              <SectionCard
                id="coach-profile"
                title="Coach profile"
                open={!collapsed.has("coachProfile")}
                onToggle={() => toggleSection("coachProfile")}
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: "var(--color-accent)" }}>
                    <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.239a1 1 0 0 0 0 1.962l1.192.24a1 1 0 0 1 .785.783l.239 1.192a1 1 0 0 0 1.962 0l.24-1.192a1 1 0 0 1 .783-.784l1.192-.24a1 1 0 0 0 0-1.962l-1.192-.239a1 1 0 0 1-.784-.785l-.24-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
                  </svg>
                }
              >
                <p className="text-xs font-inter text-ink-faint mb-5">
                  Help your coach know who and what matters to you.
                </p>

                {/* ── People ─────────────────────────────────────── */}
                <div className="mb-5">
                  <p className="text-xs font-inter font-semibold text-ink-muted mb-2">People in your life</p>

                  {/* Add person form */}
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={newCoachName}
                      onChange={(e) => setNewCoachName(e.target.value)}
                      placeholder="Their name"
                      maxLength={40}
                      className="w-full px-3 py-2 rounded-lg border bg-surface text-ink text-sm font-inter focus:outline-none focus:ring-2"
                      style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
                      onKeyDown={(e) => e.key === "Enter" && addCoachPerson()}
                    />

                    {/* Relationship dropdown */}
                    <div className="relative">
                      <select
                        value={newCoachRel}
                        onChange={(e) => setNewCoachRel(e.target.value as Relationship)}
                        className="w-full px-3 py-2 rounded-lg border bg-surface text-ink text-sm font-inter focus:outline-none focus:ring-2 appearance-none cursor-pointer pr-8"
                        style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
                      >
                        {COACH_RELATIONSHIPS.map((rel) => (
                          <option key={rel} value={rel}>{rel}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--color-ink-faint)" }}>▾</span>
                    </div>

                    {/* Family sub-type dropdown */}
                    {newCoachRel === "Family" && (
                      <>
                        <div className="relative">
                          <select
                            value={newCoachFamSub}
                            onChange={(e) => setNewCoachFamSub(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-sm font-inter focus:outline-none focus:ring-2 appearance-none cursor-pointer pr-8"
                            style={{
                              borderColor: "var(--color-accent)",
                              border: "1px solid var(--color-accent)",
                              backgroundColor: "var(--color-surface-2)",
                              color: "var(--color-accent)",
                              outlineColor: "var(--color-accent)",
                            }}
                          >
                            {FAMILY_SUB_TYPES.map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--color-accent)" }}>▾</span>
                        </div>
                        {newCoachFamSub === "Other" && (
                          <input
                            type="text"
                            value={newCoachFamOther}
                            onChange={(e) => setNewCoachFamOther(e.target.value)}
                            placeholder="e.g. Stepmother, Godfather…"
                            maxLength={30}
                            className="w-full px-3 py-2 rounded-lg border bg-surface text-ink text-sm font-inter focus:outline-none focus:ring-2"
                            style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
                          />
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={addCoachPerson}
                      disabled={!newCoachName.trim() || coachPeople.length >= 8}
                      className="self-start px-4 py-2 rounded-lg text-sm font-inter font-semibold text-white transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: "var(--color-accent)" }}
                      onMouseEnter={(e) => { if (newCoachName.trim()) e.currentTarget.style.backgroundColor = "var(--color-accent-hover)" }}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}
                    >
                      + Add person
                    </button>
                  </div>

                  {/* People profile cards — expandable */}
                  {coachPeople.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3">
                      {coachPeople.map((p, i) => {
                        const isExpanded = expandedPersonIdx === i
                        return (
                          <div
                            key={i}
                            className="rounded-xl overflow-hidden"
                            style={{ border: `1px solid ${isExpanded ? "var(--color-accent)" : "var(--color-border)"}`, background: "var(--color-surface-2)", transition: "border-color 0.15s" }}
                          >
                            {/* Card header — click to expand */}
                            <button
                              type="button"
                              onClick={() => setExpandedPersonIdx(isExpanded ? null : i)}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 font-sora"
                                  style={{ backgroundColor: "var(--color-accent)", color: "#ffffff", opacity: 0.85 }}
                                >
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-inter font-semibold text-ink leading-tight">{p.name}</p>
                                  <p className="text-xs font-inter text-ink-faint mt-0.5">{p.relationship}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {/* Detail summary badges */}
                                {p.birthday && (
                                  <span className="text-[10px] font-inter px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-surface)", color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}>🎂</span>
                                )}
                                {p.closeness && (
                                  <span className="text-[10px] font-inter px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-surface)", color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}>{CLOSENESS_LEVELS.find(c => c.value === p.closeness)?.label}</span>
                                )}
                                {/* Chevron */}
                                <svg
                                  viewBox="0 0 20 20" fill="currentColor" width="14" height="14"
                                  style={{ color: "var(--color-ink-faint)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                                >
                                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd"/>
                                </svg>
                              </div>
                            </button>

                            {/* Expanded details panel */}
                            {isExpanded && (
                              <div
                                className="px-3 pb-3 space-y-4 border-t"
                                style={{ borderColor: "var(--color-border)" }}
                              >
                                {/* Birthday */}
                                <div className="pt-3">
                                  <label className="block text-xs font-inter font-semibold text-ink-muted mb-1.5">Birthday</label>
                                  <BirthdayPicker
                                    value={p.birthday}
                                    onChange={(val) => updatePersonDetail(i, "birthday", val)}
                                    variant="themed"
                                  />
                                </div>

                                {/* Closeness */}
                                <div>
                                  <p className="text-xs font-inter font-semibold text-ink-muted mb-1.5">Relationship closeness</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {CLOSENESS_LEVELS.map((level) => {
                                      const selected = p.closeness === level.value
                                      return (
                                        <button
                                          key={level.value}
                                          type="button"
                                          onClick={() => updatePersonDetail(i, "closeness", selected ? undefined : level.value)}
                                          className="px-3 py-1.5 rounded-full text-xs font-inter font-medium transition-all duration-150"
                                          style={{
                                            background: selected ? "var(--color-accent)" : "var(--color-surface)",
                                            border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                                            color: selected ? "#ffffff" : "var(--color-ink-muted)",
                                          }}
                                        >
                                          {level.label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Personality traits */}
                                <div>
                                  <p className="text-xs font-inter font-semibold text-ink-muted mb-1.5">Personality traits</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {PERSON_TRAITS.map((trait) => {
                                      const selected = (p.traits ?? []).includes(trait)
                                      return (
                                        <button
                                          key={trait}
                                          type="button"
                                          onClick={() => togglePersonTrait(i, trait)}
                                          className="px-2.5 py-1 rounded-full text-xs font-inter font-medium transition-all duration-150"
                                          style={{
                                            background: selected ? "var(--color-accent)" : "var(--color-surface)",
                                            border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                                            color: selected ? "#ffffff" : "var(--color-ink-muted)",
                                          }}
                                        >
                                          {trait}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Notes */}
                                <div>
                                  <label className="block text-xs font-inter font-semibold text-ink-muted mb-1.5">
                                    Notes for your coach
                                    <span className="font-normal ml-1" style={{ color: "var(--color-ink-faint)" }}>(max 300 chars)</span>
                                  </label>
                                  <textarea
                                    value={p.notes ?? ""}
                                    onChange={(e) => updatePersonDetail(i, "notes", e.target.value)}
                                    placeholder="Anything your coach should know about this person…"
                                    maxLength={300}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border bg-surface text-ink text-sm font-inter resize-none focus:outline-none focus:ring-2"
                                    style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
                                  />
                                  <p className="text-[10px] font-inter text-right mt-0.5" style={{ color: "var(--color-ink-faint)" }}>
                                    {(p.notes ?? "").length}/300
                                  </p>
                                </div>

                                {/* Remove button */}
                                <button
                                  type="button"
                                  onClick={() => removeCoachPerson(i)}
                                  className="text-xs font-inter transition-colors"
                                  style={{ color: "var(--color-ink-faint)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#dc2626"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}
                                >
                                  Remove {p.name}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* ── Life context ────────────────────────────────── */}
                <div className="mb-5">
                  <p className="text-xs font-inter font-semibold text-ink-muted mb-2">Life phase</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    {COACH_LIFE_PHASES.map((phase) => {
                      const selected = coachLifePhase === phase
                      return (
                        <button
                          key={phase}
                          type="button"
                          onClick={() => handleCoachPhaseChange(phase)}
                          className="px-3 py-2 rounded-lg text-xs font-inter font-medium text-left transition-all duration-150"
                          style={{
                            background: selected ? "var(--color-surface-2)" : "transparent",
                            border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                            color: selected ? "var(--color-ink)" : "var(--color-ink-muted)",
                          }}
                        >
                          {phase}
                        </button>
                      )
                    })}
                  </div>

                  <p className="text-xs font-inter font-semibold text-ink-muted mb-2">What&apos;s going on</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COACH_SITUATIONS.map((s) => {
                      const selected = coachSituations.includes(s)
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleCoachSituation(s)}
                          className="px-2.5 py-1 rounded-full text-xs font-inter font-medium transition-all duration-150"
                          style={{
                            background: selected ? "var(--color-accent)" : "var(--color-surface-2)",
                            border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                            color: selected ? "#ffffff" : "var(--color-ink-muted)",
                          }}
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ── Privacy toggle ──────────────────────────────── */}
                <div
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  <button
                    type="button"
                    onClick={handleCoachToggleAttempt}
                    aria-label="Toggle AI sees my entries"
                    className="relative shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      backgroundColor: coachContextEnabled ? "var(--color-accent)" : "var(--color-border)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                      style={{ transform: coachContextEnabled ? "translateX(16px)" : "translateX(0)" }}
                    />
                  </button>
                  <div>
                    <p className="text-xs font-inter font-semibold text-ink">AI sees my journal entries</p>
                    <p className="text-xs font-inter text-ink-faint mt-0.5">
                      Coach reads your last 10 entries for deeper context. Entries are decrypted in your browser — never stored in plaintext.
                    </p>
                  </div>
                </div>

                {/* ── About you (bio) ─────────────────────────────── */}
                <div className="mt-5">
                  <p className="text-xs font-inter font-semibold text-ink-muted mb-1.5">About you</p>
                  <p className="text-xs font-inter text-ink-faint mb-2">
                    Anything your coach should know — your values, background, what you&apos;re working towards.
                  </p>
                  <textarea
                    value={userBio}
                    onChange={(e) => {
                      setUserBio(e.target.value)
                      schedulePatch({ userBio: e.target.value || null })
                    }}
                    placeholder="e.g. I'm a 28-year-old working in tech, focused on building healthier habits and navigating a career transition…"
                    rows={3}
                    maxLength={600}
                    className="w-full px-3 py-2 rounded-lg border bg-surface text-ink text-sm font-inter resize-none focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
                  />
                  <p className="text-right text-[10px] font-inter mt-0.5" style={{ color: "var(--color-ink-faint)" }}>
                    {userBio.length}/600
                  </p>
                </div>

                {/* ── Coach style ─────────────────────────────────── */}
                <div className="mt-4">
                  <p className="text-xs font-inter font-semibold text-ink-muted mb-1.5">Coaching style</p>
                  <div className="flex flex-wrap gap-2">
                    {(["balanced", "gentle", "direct", "challenging"] as const).map((style) => {
                      const labels: Record<string, string> = {
                        balanced:    "Balanced",
                        gentle:      "Gentle & validating",
                        direct:      "Direct & concise",
                        challenging: "Challenging & growth-focused",
                      }
                      const isSelected = coachStyle === style
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => {
                            setCoachStyle(style)
                            schedulePatch({ coachStyle: style })
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-inter font-medium transition-all"
                          style={{
                            background: isSelected ? "var(--color-accent)" : "var(--color-surface-2)",
                            border: `1px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                            color: isSelected ? "#ffffff" : "var(--color-ink-muted)",
                          }}
                        >
                          {labels[style]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </SectionCard>

            </div>

            {/* ── Right column ────────────────────────────────────── */}
            <div className="space-y-6">

              {/* Color scheme */}
              <SectionCard title="Color scheme" open={!collapsed.has("colorScheme")} onToggle={() => toggleSection("colorScheme")}>

                {/* Swatches row */}
                <div className="flex gap-3 flex-wrap items-end">
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
                          className="w-10 h-10 rounded-full transition-all flex items-center justify-center"
                          style={{
                            backgroundColor: t.bg,
                            border: isSelected ? `2px solid ${t.accent}` : "2px solid transparent",
                            boxShadow: isSelected
                              ? `0 0 0 2px ${t.accent}`
                              : "0 0 0 1px #d1d5db",
                            color: t.accent,
                            fontSize: "1rem",
                            lineHeight: 1,
                          }}
                        >
                          {isSelected ? "✓" : ""}
                        </span>
                        <span
                          className="text-xs font-inter"
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

                  {/* Custom button */}
                  <button
                    onClick={() => handleThemeChange("CUSTOM")}
                    aria-label="Custom"
                    title="Custom color"
                    className="flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <span
                      className="w-10 h-10 rounded-full transition-all flex items-center justify-center"
                      style={{
                        background: isCustom
                          ? `conic-gradient(#2563EB, #7c3aed, #dc2626, #059669, #d97706, #2563EB)`
                          : `conic-gradient(#2563EB 0deg, #7c3aed 60deg, #dc2626 120deg, #059669 180deg, #d97706 240deg, #db2777 300deg, #2563EB 360deg)`,
                        border: isCustom ? "2px solid var(--color-accent)" : "2px solid transparent",
                        boxShadow: isCustom
                          ? "0 0 0 2px var(--color-accent)"
                          : "0 0 0 1px #d1d5db",
                      }}
                    >
                      {isCustom ? (
                        <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>✓</span>
                      ) : (
                        <svg viewBox="0 0 20 20" fill="none" width="16" height="16" stroke="#fff" strokeWidth="1.5" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 2.47a.75.75 0 0 1 0 1.06L4.56 8.5l4.97 4.97a.75.75 0 0 1-1.06 1.06L3.5 9.56a.75.75 0 0 1 0-1.06l4.97-4.97a.75.75 0 0 1 1.06 0ZM16.5 10a.75.75 0 0 1-.75.75H9a.75.75 0 0 1 0-1.5h6.75a.75.75 0 0 1 .75.75Z" />
                          <circle cx="14" cy="10" r="3" fill="none" stroke="#fff" strokeWidth="1.5"/>
                        </svg>
                      )}
                    </span>
                    <span
                      className="text-xs font-inter"
                      style={{
                        color: isCustom ? "var(--color-ink)" : "var(--color-ink-muted)",
                        fontWeight: isCustom ? 600 : 400,
                      }}
                    >
                      Custom
                    </span>
                  </button>
                </div>

                {/* Custom color picker panel */}
                <div
                  style={{
                    maxHeight: isCustom ? "600px" : "0px",
                    overflow: "hidden",
                    transition: "max-height 0.35s ease",
                  }}
                >
                  <div
                    className="mt-4 rounded-xl p-4 space-y-5"
                    style={{
                      backgroundColor: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {/* Accent color */}
                    <div>
                      <p className="text-xs font-inter font-semibold text-ink-muted uppercase tracking-wide mb-3">
                        Accent color
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {PRESET_ACCENTS.map((hex) => (
                          <button
                            key={hex}
                            onClick={() => handleAccentChange(hex)}
                            aria-label={hex}
                            title={hex}
                            className="w-8 h-8 rounded-full transition-all focus:outline-none"
                            style={{
                              backgroundColor: hex,
                              boxShadow: pickerAccent === hex
                                ? `0 0 0 2px var(--color-surface-2), 0 0 0 4px ${hex}`
                                : "0 0 0 1px rgba(0,0,0,0.15)",
                              transform: pickerAccent === hex ? "scale(1.15)" : "scale(1)",
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pickerAccent}
                          onChange={(e) => handleAccentChange(e.target.value)}
                          className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5"
                          style={{ backgroundColor: "transparent" }}
                        />
                        <span className="text-sm font-inter text-ink-muted font-mono">{pickerAccent}</span>
                      </div>
                    </div>

                    {/* Background color */}
                    <div>
                      <p className="text-xs font-inter font-semibold text-ink-muted uppercase tracking-wide mb-3">
                        Background
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {PRESET_PAGES.map((hex) => (
                          <button
                            key={hex}
                            onClick={() => handlePageChange(hex)}
                            aria-label={hex}
                            title={hex}
                            className="w-8 h-8 rounded-full transition-all focus:outline-none"
                            style={{
                              backgroundColor: hex,
                              boxShadow: pickerPage === hex
                                ? `0 0 0 2px var(--color-surface-2), 0 0 0 4px var(--color-accent)`
                                : "0 0 0 1px rgba(0,0,0,0.2)",
                              transform: pickerPage === hex ? "scale(1.15)" : "scale(1)",
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pickerPage}
                          onChange={(e) => handlePageChange(e.target.value)}
                          className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5"
                          style={{ backgroundColor: "transparent" }}
                        />
                        <span className="text-sm font-inter text-ink-muted font-mono">{pickerPage}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Appearance — hidden when custom theme is active (user controls colours directly) */}
              {!isCustom && <SectionCard title="Appearance" open={!collapsed.has("appearance")} onToggle={() => toggleSection("appearance")}>
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
                        className="px-4 py-2 text-sm font-inter font-medium transition-colors focus:outline-none"
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
              </SectionCard>}

              {/* ── Weekly Digest ─────────────────────────────────── */}
              <SectionCard
                title="Weekly digest"
                open={!collapsed.has("weeklyDigest")}
                onToggle={() => toggleSection("weeklyDigest")}
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: "var(--color-accent)" }}>
                    <path fillRule="evenodd" d="M5.404 14.596A6.5 6.5 0 1 1 16.5 10a1.25 1.25 0 0 1-2.5 0 4 4 0 1 0-1.174 2.826.75.75 0 0 1 1.06 1.06 5.5 5.5 0 1 1 .496-7.955 6.5 6.5 0 0 1-8.978 8.665ZM10 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" clipRule="evenodd" />
                  </svg>
                }
              >
                <p className="text-xs font-inter text-ink-faint mb-4">
                  Receive a weekly email reflection based on your entries, moods, and coach sessions.
                </p>
                <div
                  className="flex items-start gap-3 p-3 rounded-xl mb-4"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const next = !digestEnabled
                      setDigestEnabled(next)
                      schedulePatch({ digestEnabled: next })
                    }}
                    aria-label="Toggle weekly digest"
                    className="relative shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{ backgroundColor: digestEnabled ? "var(--color-accent)" : "var(--color-border)" }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                      style={{ transform: digestEnabled ? "translateX(16px)" : "translateX(0)" }}
                    />
                  </button>
                  <div>
                    <p className="text-xs font-inter font-semibold text-ink">Send me a weekly reflection</p>
                    <p className="text-xs font-inter text-ink-faint mt-0.5">Arrives on your chosen day — based on entry titles, moods, and saved memories only.</p>
                  </div>
                </div>
                {digestEnabled && (
                  <div>
                    <p className="text-xs font-inter font-semibold text-ink-muted mb-2">Digest day</p>
                    <div className="flex flex-wrap gap-2">
                      {["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].map((day) => {
                        const isSelected = digestDay === day
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => { setDigestDay(day); schedulePatch({ digestDay: day }) }}
                            className="px-2.5 py-1 rounded-full text-xs font-inter font-medium capitalize transition-all"
                            style={{
                              background: isSelected ? "var(--color-accent)" : "var(--color-surface-2)",
                              border: `1px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                              color: isSelected ? "#ffffff" : "var(--color-ink-muted)",
                            }}
                          >
                            {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* ── Saved Memories ────────────────────────────────── */}
              <SectionCard
                title={`Saved memories${memories.length > 0 ? ` (${memories.length})` : ""}`}
                open={!collapsed.has("savedMemories")}
                onToggle={() => toggleSection("savedMemories")}
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: "var(--color-accent)" }}>
                    <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-2.09c-1.99-2.02-3.63-4.865-3.63-8.13a5.254 5.254 0 0 1 10.508 0c0 3.265-1.64 6.11-3.63 8.13a22.042 22.042 0 0 1-2.582 2.09 20.759 20.759 0 0 1-1.162.682l-.019.01-.005.003h-.002a.5.5 0 0 1-.468 0h-.002Z" />
                  </svg>
                }
              >
                <p className="text-xs font-inter text-ink-faint mb-4">
                  Insights bookmarked from coach conversations. Your coach references these across sessions.
                </p>

                {!memoriesLoaded ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-pulse w-5 h-5 rounded-full" style={{ backgroundColor: "var(--color-border)" }} />
                  </div>
                ) : memories.length === 0 ? (
                  <p className="text-xs font-inter text-center py-4" style={{ color: "var(--color-ink-faint)" }}>
                    No memories saved yet. Hit &ldquo;Save&rdquo; on any coach response to bookmark it.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {memories.map((mem) => (
                      <div
                        key={mem.id}
                        className="flex items-start gap-2 p-2.5 rounded-xl group"
                        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                      >
                        <p className="flex-1 text-xs font-inter text-ink leading-relaxed">{mem.content}</p>
                        <button
                          type="button"
                          onClick={async () => {
                            const prev = memories
                            setMemories(memories.filter((m) => m.id !== mem.id))
                            try {
                              await fetch(`/api/memories/${mem.id}`, { method: "DELETE" })
                            } catch {
                              setMemories(prev)
                            }
                          }}
                          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--color-ink-faint)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-ink)" }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--color-ink-faint)" }}
                          title="Delete memory"
                        >
                          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Change password */}
              <SectionCard title="Change password" open={!collapsed.has("changePassword")} onToggle={() => toggleSection("changePassword")}>
                <p className="text-xs font-inter text-ink-faint mb-5">
                  Your entries are re-encrypted automatically — changing the password only takes a second.
                </p>

                {pwSuccess && (
                  <div
                    className="mb-4 px-4 py-3 rounded-xl text-sm font-inter flex items-center gap-2"
                    style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#16a34a" }}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" className="shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                    Password changed successfully.
                  </div>
                )}

                {pwError && (
                  <div
                    className="mb-4 px-4 py-3 rounded-xl text-sm font-inter"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#dc2626" }}
                  >
                    {pwError}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-3">
                  {[
                    { label: "Current password", value: pwCurrent, onChange: setPwCurrent, autocomplete: "current-password" },
                    { label: "New password",      value: pwNew,     onChange: setPwNew,     autocomplete: "new-password"     },
                    { label: "Confirm new",       value: pwConfirm, onChange: setPwConfirm, autocomplete: "new-password"     },
                  ].map(({ label, value, onChange, autocomplete }, idx) => (
                    <div key={label}>
                      <label className="block text-xs font-inter font-medium text-ink-muted mb-1.5">{label}</label>
                      <div className="relative">
                        <input
                          type={pwShow[idx] ? "text" : "password"}
                          value={value}
                          onChange={(e) => { onChange(e.target.value); setPwError(""); setPwSuccess(false) }}
                          autoComplete={autocomplete}
                          className="w-full px-3 py-2 pr-10 rounded-lg border bg-surface text-ink text-sm font-inter focus:outline-none focus:ring-2"
                          style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
                          disabled={pwChanging}
                        />
                        <button
                          type="button"
                          onClick={() => setPwShow((s) => s.map((v, i) => i === idx ? !v : v))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: "var(--color-ink-faint)" }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-ink-muted)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}
                          aria-label={pwShow[idx] ? "Hide" : "Show"}
                          tabIndex={-1}
                        >
                          {pwShow[idx] ? (
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="17" height="17" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 3l14 14M8.5 8.68A2.5 2.5 0 0 0 11.32 11.5M6.1 6.1C4.33 7.18 3 8.93 3 10c0 0 2.5 5.5 7 5.5a6.87 6.87 0 0 0 3.9-1.1M10 4.5c4.5 0 7 5.5 7 5.5a12.5 12.5 0 0 1-1.65 2.35"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="17" height="17" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2.5 10S5.5 4.5 10 4.5 17.5 10 17.5 10 14.5 15.5 10 15.5 2.5 10 2.5 10Z"/>
                              <circle cx="10" cy="10" r="2.5"/>
                            </svg>
                          )}
                        </button>
                      </div>
                      {/* Strength meter — only on the new password field */}
                      {idx === 1 && <PasswordStrengthMeter password={pwNew} variant="light" />}
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={pwChanging}
                    className="w-full mt-1 py-2.5 rounded-xl text-sm font-inter font-semibold text-white transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-accent)" }}
                    onMouseEnter={(e) => { if (!pwChanging) e.currentTarget.style.backgroundColor = "var(--color-accent-hover)" }}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}
                  >
                    {pwChanging ? "Changing password…" : "Change password"}
                  </button>
                </form>

                <p className="mt-4 text-center text-xs font-inter" style={{ color: "var(--color-ink-faint)" }}>
                  Forgot your current password?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.removeItem("masterPassword")
                      router.push("/journal")
                    }}
                    className="underline transition-colors"
                    style={{ color: "var(--color-ink-muted)" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-ink)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-muted)"}
                  >
                    Reset via email
                  </button>
                </p>
              </SectionCard>

              {/* Account */}
              <SectionCard title="Account" open={!collapsed.has("account")} onToggle={() => toggleSection("account")}>
                <p className="text-xs text-ink-faint mb-3 font-inter">
                  Signing out clears your master password from this device.
                </p>
                <button
                  onClick={() => {
                    sessionStorage.removeItem("masterPassword")
                    window.location.href = "/api/auth/logout"
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-inter font-medium transition-colors"
                  style={{
                    color: "#dc2626",
                    border: "1px solid rgba(220,38,38,0.25)",
                    backgroundColor: "rgba(220,38,38,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.12)"
                    e.currentTarget.style.borderColor     = "rgba(220,38,38,0.4)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.06)"
                    e.currentTarget.style.borderColor     = "rgba(220,38,38,0.25)"
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l3 3m0 0l-3 3m3-3H8m5-7H5a2 2 0 00-2 2v10a2 2 0 002 2h8" />
                  </svg>
                  Sign out
                </button>

                {/* Danger zone */}
                <div
                  className="mt-6 pt-5"
                  style={{ borderTop: "1px solid var(--color-border)" }}
                >
                  <p className="text-xs font-inter font-semibold uppercase tracking-widest mb-1" style={{ color: "#dc2626" }}>
                    Delete Account
                  </p>
                  <p className="text-xs text-ink-faint mb-3 font-inter">
                    Permanently deletes your account, all journal entries, habits, coach history, and every other piece of data. This cannot be undone.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowDeleteModal(true); setDeleteError(""); setDeletePassword("") }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-inter font-medium transition-colors"
                    style={{
                      color: "#dc2626",
                      border: "1px solid rgba(220,38,38,0.35)",
                      backgroundColor: "rgba(220,38,38,0.08)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.15)"
                      e.currentTarget.style.borderColor     = "rgba(220,38,38,0.55)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.08)"
                      e.currentTarget.style.borderColor     = "rgba(220,38,38,0.35)"
                    }}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                    </svg>
                    Delete my account
                  </button>
                </div>
              </SectionCard>

            </div>
          </div>
        </main>
      </div>
      {/* Privacy disclosure modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowPrivacyModal(false)}
          />
          {/* Modal */}
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ color: "var(--color-accent)" }}>
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
              </svg>
              <h3 className="text-sm font-sora font-semibold text-ink">Privacy disclosure</h3>
            </div>
            <div className="space-y-2.5 mb-5">
              <p className="text-sm font-inter text-ink-muted leading-relaxed">
                When this is enabled, your coach will read your <strong className="text-ink">last 10 journal entries</strong> for context.
              </p>
              <p className="text-sm font-inter text-ink-muted leading-relaxed">
                <strong className="text-ink">How it works:</strong> entries are decrypted right here in your browser, then sent securely to Anthropic&apos;s API. They are processed for your response and not stored in plaintext on any server.
              </p>
              <p className="text-sm font-inter text-ink-muted leading-relaxed">
                You can turn this off at any time in Settings.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="flex-1 py-2 rounded-xl text-sm font-inter font-medium transition-colors"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink-muted)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCoachContext}
                className="flex-1 py-2 rounded-xl text-sm font-inter font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--color-accent)" }}
              >
                I understand, enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete account modal ─────────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => !deleteLoading && setShowDeleteModal(false)}
          />
          {/* Modal */}
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--color-surface)", border: "1px solid rgba(220,38,38,0.3)" }}
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(220,38,38,0.12)" }}
            >
              <svg viewBox="0 0 20 20" fill="#dc2626" width="18" height="18">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </div>

            <h3 className="text-base font-sora font-bold text-ink mb-1">Delete your account?</h3>
            <p className="text-sm font-inter leading-relaxed mb-4" style={{ color: "var(--color-ink-muted)" }}>
              This permanently erases <strong className="text-ink">everything</strong> — all journal entries, coach sessions, habits, memories, and your account. There is no recovery.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-inter font-medium mb-1.5" style={{ color: "var(--color-ink-muted)" }}>
                  Enter your password to confirm
                </label>
                <div className="relative">
                  <input
                    type={deleteShowPw ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => { setDeletePassword(e.target.value); setDeleteError("") }}
                    placeholder="Your password"
                    autoComplete="current-password"
                    disabled={deleteLoading}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm font-inter focus:outline-none"
                    style={{
                      background: "var(--color-surface-2)",
                      border: deleteError ? "1px solid rgba(220,38,38,0.6)" : "1px solid var(--color-border)",
                      color: "var(--color-ink)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setDeleteShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-ink-faint)" }}
                    tabIndex={-1}
                  >
                    {deleteShowPw ? (
                      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd"/></svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd"/><path d="M10.748 13.93a4 4 0 0 1-4.687-4.687l-2.835-2.836a10.006 10.006 0 0 0-1.77 3.694 1.65 1.65 0 0 0 0 1.186A10.004 10.004 0 0 0 9.999 17c.396 0 .787-.022 1.17-.064l-.421-.422Z"/></svg>
                    )}
                  </button>
                </div>
                {deleteError && (
                  <p className="mt-1.5 text-xs font-inter" style={{ color: "#dc2626" }}>{deleteError}</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-inter font-medium transition-colors"
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || !deletePassword}
                  className="flex-1 py-2.5 rounded-xl text-sm font-inter font-semibold text-white transition-opacity"
                  style={{
                    background: "#dc2626",
                    opacity: deleteLoading || !deletePassword ? 0.5 : 1,
                  }}
                >
                  {deleteLoading ? "Deleting…" : "Delete everything"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  )
}
