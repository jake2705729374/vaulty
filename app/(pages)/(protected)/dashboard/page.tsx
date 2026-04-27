"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { getDailyQuote, type QuoteCategory } from "@/lib/quotes"
import { getStreak } from "@/lib/streak"
import MoodCalendar from "@/components/MoodCalendar"
import SplashScreen from "@/components/SplashScreen"

// ── SVG Icons (Heroicons 2 outline, consistent 1.5 stroke) ────────────────
function IconPen({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  )
}
function IconSparkles({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}
function IconCog({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}
function IconDocumentText({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}
function IconCalendar({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}
function IconFire() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  )
}
function IconChevronRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}
function IconBookOpen({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}
function IconCheckCircle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────
type Mood = "GREAT" | "GOOD" | "OKAY" | "LOW" | "AWFUL"
type Goal = "mental_clarity" | "emotional_wellbeing" | "personal_growth" | "creativity" | "gratitude" | "habit_tracking"
type Frequency = "daily" | "few_times_week" | "weekly" | "whenever"

interface EntryMeta {
  id: string
  title: string
  createdAt: string
  mood: Mood | null
}

interface Prefs {
  displayName:         string | null
  journalingGoals:     string | null   // JSON string
  journalingFrequency: Frequency | null
  quoteCategories:     string | null
}

// ── Mood config ───────────────────────────────────────────────────────────
const MOOD_CONFIG: Record<Mood, { label: string; color: string }> = {
  GREAT: { label: "Great", color: "#22c55e" },
  GOOD:  { label: "Good",  color: "#3b82f6" },
  OKAY:  { label: "Okay",  color: "#eab308" },
  LOW:   { label: "Low",   color: "#f97316" },
  AWFUL: { label: "Awful", color: "#ef4444" },
}

// ── Goal → motivational sub-line ─────────────────────────────────────────
const GOAL_LINES: Record<Goal, string> = {
  mental_clarity:      "Every thought you write down clears your mind.",
  emotional_wellbeing: "Your feelings deserve space to breathe.",
  personal_growth:     "Every entry is a step forward.",
  creativity:          "The best ideas always start on the page.",
  gratitude:           "Gratitude rewires how you see the world.",
  habit_tracking:      "Consistency is the only strategy that works.",
}

// ── Frequency → streak context line ──────────────────────────────────────
const FREQUENCY_CONTEXT: Record<Frequency, string> = {
  daily:          "You're aiming to write every day — keep the streak alive.",
  few_times_week: "A few entries a week goes a long way.",
  weekly:         "One entry a week, consistently, is powerful.",
  whenever:       "Write whenever it feels right. No pressure.",
}

// ── Helpers ───────────────────────────────────────────────────────────────
function parseGoals(raw: string | null): Goal[] {
  if (!raw) return []
  try { return JSON.parse(raw) as Goal[] } catch { return [] }
}

function parseQuoteCats(raw: string | null): QuoteCategory[] {
  if (!raw) return []
  try { return JSON.parse(raw) as QuoteCategory[] } catch { return [] }
}

function getGreeting(name: string | null): string {
  const h = new Date().getHours()
  const base = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
  return name ? `${base}, ${name}` : base
}

function getSubline(goals: Goal[], frequency: Frequency | null, entryCount: number): string {
  if (entryCount === 0) return "Your vault is ready. Write your first entry."
  if (goals.length > 0) return GOAL_LINES[goals[0]]
  if (frequency)        return FREQUENCY_CONTEXT[frequency]
  return `${entryCount} ${entryCount === 1 ? "entry" : "entries"} in your vault.`
}

function getThisWeekCount(entries: EntryMeta[]): number {
  const ago = new Date()
  ago.setDate(ago.getDate() - 7)
  ago.setHours(0, 0, 0, 0)
  return entries.filter((e) => new Date(e.createdAt) >= ago).length
}

function getLast7Days(entries: EntryMeta[]) {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    const isToday = i === 6
    const matching = entries.filter((e) => {
      const ed = new Date(e.createdAt)
      ed.setHours(0, 0, 0, 0)
      return ed.getTime() === d.getTime()
    })
    return {
      label:    isToday ? "Now" : d.toLocaleDateString("en-US", { weekday: "short" }),
      date:     d.getDate(),
      mood:     matching.find((e) => e.mood)?.mood ?? null,
      hasEntry: matching.length > 0,
      entryId:  matching[0]?.id ?? null,
      isToday,
    }
  })
}

// ── Animation ─────────────────────────────────────────────────────────────
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } }
const item    = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { status } = useSession()
  const router     = useRouter()

  const [entries, setEntries] = useState<EntryMeta[]>([])
  const [prefs, setPrefs]     = useState<Prefs>({ displayName: null, journalingGoals: null, journalingFrequency: null, quoteCategories: null })
  const [loading, setLoading] = useState(true)
  const [moodView, setMoodView] = useState<"week" | "calendar">("week")
  const [dailyPrompt,       setDailyPrompt]       = useState<string | null>(null)
  const [promptSkip,        setPromptSkip]        = useState(0)
  const [promptRefreshing,  setPromptRefreshing]  = useState(false)

  // ── Refresh prompt ────────────────────────────────────────────────────
  const refreshPrompt = useCallback(async () => {
    if (promptRefreshing) return
    setPromptRefreshing(true)
    const nextSkip = promptSkip + 1
    setPromptSkip(nextSkip)
    try {
      const res = await fetch(`/api/prompts/daily?skip=${nextSkip}`)
      const data: { prompt: string } | null = res.ok ? await res.json() : null
      if (data?.prompt) setDailyPrompt(data.prompt)
    } catch { /* non-fatal */ }
    finally { setPromptRefreshing(false) }
  }, [promptSkip, promptRefreshing])

  // ── Splash screen — only triggered by login / register ────────────────
  // Login and register set "showWelcomeSplash" in sessionStorage before
  // redirecting here.  We consume the flag immediately so a refresh never
  // re-shows the animation.
  const [showSplash, setShowSplash] = useState(false)
  useEffect(() => {
    if (sessionStorage.getItem("showWelcomeSplash")) {
      sessionStorage.removeItem("showWelcomeSplash")
      setShowSplash(true)
    }
  }, [])
  const handleSplashDone = useCallback(() => setShowSplash(false), [])

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    Promise.all([
      fetch("/api/entries").then((r) =>
        r.ok ? (r.json() as Promise<{ entries: EntryMeta[] }>) : { entries: [] as EntryMeta[] }
      ),
      fetch("/api/user/preferences").then((r) =>
        r.ok ? (r.json() as Promise<Prefs>) : { displayName: null, journalingGoals: null, journalingFrequency: null, quoteCategories: null }
      ),
    ])
      .then(([entriesData, prefsData]) => {
        setEntries(entriesData.entries ?? [])
        setPrefs(prefsData)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Load personalised daily prompt
    fetch("/api/prompts/daily")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { prompt: string } | null) => { if (data?.prompt) setDailyPrompt(data.prompt) })
      .catch(() => { /* non-fatal */ })

    // Trigger weekly digest check (no-op if too soon or disabled)
    fetch("/api/digest/weekly").catch(() => { /* non-fatal */ })
  }, [status])

  const streak     = useMemo(() => getStreak(entries),        [entries])
  const thisWeek   = useMemo(() => getThisWeekCount(entries), [entries])
  const last7Days  = useMemo(() => getLast7Days(entries),     [entries])
  const recent     = entries.slice(0, 5)
  const goals      = useMemo(() => parseGoals(prefs.journalingGoals),  [prefs.journalingGoals])
  const dailyQuote = useMemo(() => getDailyQuote(parseQuoteCats(prefs.quoteCategories)), [prefs.quoteCategories])

  // Must have auth before rendering anything
  if (status === "loading") return null

  // Computed values are safe with empty defaults while data loads
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  const subline    = getSubline(goals, prefs.journalingFrequency, entries.length)

  const STATS = [
    { label: "Total entries", value: entries.length, Icon: IconDocumentText },
    { label: "This week",     value: thisWeek,        Icon: IconCalendar     },
    { label: "Day streak",    value: streak,           Icon: IconFire         },
  ]

  const ACTIONS = [
    { href: "/journal?view=new", Icon: IconPen,           label: "Write an entry",    sub: "Start a new journal entry"         },
    { href: "/journal",          Icon: IconBookOpen,       label: "Past entries",      sub: `${entries.length} ${entries.length === 1 ? "entry" : "entries"} in your vault` },
    { href: "/habits",           Icon: IconCheckCircle,   label: "Track habits",      sub: "Check in on your daily habits"     },
    { href: "/coach",            Icon: IconSparkles,      label: "Talk to Coach",     sub: "Your personal AI coach"            },
  ]

  return (
    <>
    {/* Splash — shown once per browser session, overlays everything */}
    <SplashScreen
      name={prefs.displayName}
      visible={showSplash}
      onDone={handleSplashDone}
    />

    <motion.div
      className="min-h-dvh bg-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: showSplash ? 0 : 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
    {loading ? (
      /* Data still loading and no splash covering it */
      <div className="min-h-dvh flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
      </div>
    ) : (<>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b border-theme"
        style={{ background: "var(--color-surface)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center justify-between px-4 md:px-8 h-14 max-w-screen-xl mx-auto">

          {/* Personalised identity — monogram + "{Name}'s Journal" */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Monogram circle — first letter of display name */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold font-sora shrink-0 select-none"
              style={{ background: "var(--color-accent)" }}
              aria-hidden="true"
            >
              {prefs.displayName ? prefs.displayName.trim().charAt(0).toUpperCase() : "V"}
            </div>
            <span className="text-sm font-semibold text-ink tracking-tight font-sora truncate">
              {prefs.displayName ? `${prefs.displayName}'s Journal` : "My Journal"}
            </span>
          </div>

          {/* Desktop nav — Inter */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {[
              { href: "/journal",   label: "Journal"    },
              { href: "/habits",    label: "Habits"     },
              { href: "/coach",     label: "Coach"      },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-muted hover:text-ink transition-colors font-inter"
              >
                {label}
              </Link>
            ))}
          </nav>

          <Link href="/settings" aria-label="Settings" className="p-2 rounded-lg text-ink-muted hover:text-ink transition-colors">
            <IconCog className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="px-4 md:px-8 py-8 md:py-10 max-w-screen-xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">

          {/* Greeting block */}
          <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {/* Sora — same as landing page hero headline */}
              <h1 className="text-2xl md:text-3xl font-sora font-semibold text-ink leading-snug">
                {getGreeting(prefs.displayName)}
              </h1>
              {/* Inter — date and goal-personalised subline */}
              <p className="text-sm font-inter text-ink-muted mt-0.5">{todayLabel}</p>
              <p className="text-sm font-inter text-ink-muted mt-1 italic">{subline}</p>
            </div>

            <Link href="/journal?view=new" className="shrink-0">
              <span
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold font-inter text-white transition-opacity duration-150 hover:opacity-90 active:scale-[0.97]"
                style={{
                  background: "var(--color-accent)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.10)",
                }}
              >
                <IconPen className="w-4 h-4" />
                New entry
              </span>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div variants={item}>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {STATS.map(({ label, value, Icon }) => {
                const isFireStat = label === "Day streak"
                const isLit = isFireStat && streak > 0
                return (
                  <div
                    key={label}
                    className="rounded-2xl p-4 md:p-5 bg-surface flex flex-col gap-4"
                    style={{ border: "1px solid var(--color-border)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "var(--color-surface-2)" }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          color: isLit ? "#f97316" : undefined,
                          filter: isLit
                            ? "drop-shadow(0 0 6px #f97316) drop-shadow(0 0 12px #fb923c)"
                            : "none",
                        }}
                      >
                        <Icon />
                      </span>
                    </div>
                    <div>
                      {/* Sora for numbers — same weight as landing page stats */}
                      <p className="text-2xl font-sora font-bold text-ink tabular-nums leading-none">{value}</p>
                      <p className="text-xs font-inter font-medium text-ink-muted mt-1">{label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Body grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 items-start">

            {/* Recent entries */}
            <motion.div variants={item} className="md:col-span-3">

              {/* Today's writing prompt — above recent entries */}
              {dailyPrompt && (
                <div
                  className="mb-4 rounded-2xl p-5 bg-surface transition-all duration-150"
                  style={{ border: "1px solid var(--color-border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-inter font-semibold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>
                      Today&apos;s prompt
                    </span>

                    {/* Actions row */}
                    <div className="flex items-center gap-2">
                      {/* Refresh button */}
                      <button
                        onClick={refreshPrompt}
                        disabled={promptRefreshing}
                        title="Get a different prompt"
                        className="w-6 h-6 flex items-center justify-center rounded-md transition-colors disabled:opacity-40"
                        style={{ color: "var(--color-ink-faint)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent)"; e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-faint)"; e.currentTarget.style.backgroundColor = "transparent" }}
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          width="14" height="14"
                          className={promptRefreshing ? "animate-spin" : ""}
                          style={{ transformOrigin: "center" }}
                        >
                          <path d="M4 10a6 6 0 0 1 10.47-4" />
                          <path d="M16 10a6 6 0 0 1-10.47 4" />
                          <polyline points="14.5 5.5 16.5 6 16 4" />
                          <polyline points="5.5 14.5 3.5 14 4 16" />
                        </svg>
                      </button>

                      {/* Write CTA */}
                      <Link
                        href={`/journal?view=new&prompt=${encodeURIComponent(dailyPrompt)}`}
                        className="text-[10px] font-inter font-medium transition-colors"
                        style={{ color: "var(--color-ink-faint)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-faint)" }}
                      >
                        Write →
                      </Link>
                    </div>
                  </div>

                  {/* Prompt text — clicking it also navigates to a new entry */}
                  <Link
                    href={`/journal?view=new&prompt=${encodeURIComponent(dailyPrompt)}`}
                    className="block text-sm font-inter leading-relaxed text-ink hover:text-ink transition-colors"
                  >
                    {dailyPrompt}
                  </Link>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-inter font-semibold text-ink-faint uppercase tracking-widest">
                  Recent entries
                </h2>
                {entries.length > 0 && (
                  <Link href="/journal" className="text-xs font-inter font-medium text-ink-muted hover:text-ink transition-colors">
                    View all →
                  </Link>
                )}
              </div>

              {recent.length === 0 ? (
                <div
                  className="rounded-2xl p-10 bg-surface flex flex-col items-center justify-center gap-4 text-center"
                  style={{ border: "1px dashed var(--color-border)" }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--color-surface-2)" }}>
                    <IconBookOpen className="w-6 h-6 text-ink-faint" />
                  </div>
                  <div>
                    <p className="text-sm font-sora font-semibold text-ink">No entries yet</p>
                    <p className="text-xs font-inter text-ink-faint mt-1 max-w-[200px] mx-auto leading-relaxed">
                      Your first entry is waiting to be written.
                    </p>
                  </div>
                  <Link href="/journal?view=new">
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-inter font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: "var(--color-accent)" }}
                    >
                      <IconPen className="w-3.5 h-3.5" />
                      Write your first entry
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl bg-surface overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                  {recent.map((entry, idx) => {
                    const cfg = entry.mood ? MOOD_CONFIG[entry.mood] : null
                    const date = new Date(entry.createdAt)
                    const isThisYear = date.getFullYear() === new Date().getFullYear()
                    const formatted = date.toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                      ...(isThisYear ? {} : { year: "numeric" }),
                    })
                    return (
                      <Link
                        href={`/journal/${entry.id}`}
                        key={entry.id}
                        className="block"
                      >
                        <div
                          className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150"
                          style={{
                            borderBottom: idx < recent.length - 1 ? "1px solid var(--color-border)" : "none",
                            background: "transparent",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-2)" }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                        >
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: cfg ? cfg.color : "var(--color-border)" }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-inter font-medium truncate leading-snug" style={{ color: "var(--color-ink)" }}>
                              {entry.title || "Untitled"}
                            </p>
                            <p className="text-xs font-inter mt-0.5" style={{ color: "var(--color-ink-faint)" }}>{formatted}</p>
                          </div>
                          {cfg && (
                            <span
                              className="shrink-0 text-[10px] font-inter font-semibold px-2 py-0.5 rounded-full hidden sm:inline-block"
                              style={{ color: cfg.color, background: `${cfg.color}18` }}
                            >
                              {cfg.label}
                            </span>
                          )}
                          <span className="shrink-0" style={{ color: "var(--color-ink-faint)" }}><IconChevronRight className="w-3.5 h-3.5" /></span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Daily quote */}
              <div
                className="mt-4 rounded-2xl p-5 bg-surface relative overflow-hidden"
                style={{ border: "1px solid var(--color-border)" }}
              >
                {/* Decorative large quote mark */}
                <div
                  className="absolute top-3 right-4 text-6xl font-sora font-bold leading-none select-none pointer-events-none"
                  style={{ color: "var(--color-border)", opacity: 0.7 }}
                  aria-hidden="true"
                >
                  &ldquo;
                </div>
                <div className="relative">
                  <p className="text-sm font-inter leading-relaxed text-ink italic pr-8">
                    &ldquo;{dailyQuote.text}&rdquo;
                  </p>
                  <p className="mt-2 text-xs font-inter font-semibold text-ink-muted">
                    &mdash; {dailyQuote.author}
                  </p>
                  <span
                    className="mt-3 inline-block text-[10px] font-inter font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-ink-faint)",
                    }}
                  >
                    {dailyQuote.category}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Sidebar */}
            <div className="md:col-span-2 space-y-4">

              {/* Mood strip / calendar */}
              <motion.div variants={item}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-inter font-semibold text-ink-faint uppercase tracking-widest">
                    Mood
                  </h2>
                  <div className="flex gap-1">
                    {(["week", "calendar"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setMoodView(v)}
                        className="text-[10px] font-inter px-2 py-0.5 rounded-md transition-colors capitalize"
                        style={{
                          background: moodView === v ? "var(--color-accent)" : "var(--color-surface-2)",
                          color: moodView === v ? "white" : "var(--color-ink-faint)",
                        }}
                      >{v}</button>
                    ))}
                  </div>
                </div>
                {moodView === "week" ? (
                  <div className="rounded-2xl p-4 bg-surface" style={{ border: "1px solid var(--color-border)" }}>

                    {/* Month label */}
                    <p className="text-[10px] font-inter font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-ink-faint)" }}>
                      {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>

                    <div className="flex gap-1.5">
                      {last7Days.map((day, i) => {
                        const cfg       = day.mood ? MOOD_CONFIG[day.mood] : null
                        const clickable = !!day.entryId

                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">

                            {/* Mood box — clickable when an entry exists for that day */}
                            <div
                              className="w-full rounded-xl relative overflow-hidden flex items-center justify-center transition-transform duration-150"
                              style={{
                                aspectRatio: "1 / 1",
                                cursor:      clickable ? "pointer" : "default",
                                ...(cfg
                                  ? { background: `${cfg.color}1A`, border: `1px solid ${cfg.color}40` }
                                  : day.isToday
                                    ? { background: "var(--color-surface-2)", border: "1px dashed var(--color-border)" }
                                    : {
                                        background: day.hasEntry ? "var(--color-surface-2)" : "transparent",
                                        border:     `1px solid ${day.hasEntry ? "var(--color-border)" : "transparent"}`,
                                      }),
                              }}
                              onClick={clickable ? () => router.push(`/journal/${day.entryId}`) : undefined}
                              role={clickable ? "button" : undefined}
                              title={cfg ? `${cfg.label}${clickable ? " — view entry" : ""}` : clickable ? "View entry" : undefined}
                              onMouseEnter={(e) => { if (clickable) e.currentTarget.style.transform = "scale(1.06)" }}
                              onMouseLeave={(e) => { if (clickable) e.currentTarget.style.transform = "scale(1)" }}
                            >
                              {/* X cross for today with no mood logged */}
                              {day.isToday && !cfg && (
                                <svg
                                  className="absolute inset-0 w-full h-full"
                                  viewBox="0 0 40 40"
                                  preserveAspectRatio="none"
                                  aria-hidden
                                >
                                  <line x1="9" y1="9" x2="31" y2="31" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" />
                                  <line x1="31" y1="9" x2="9" y2="31" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              )}

                              {/* Mood dot */}
                              {cfg && <div className="w-2.5 h-2.5 rounded-full z-10" style={{ background: cfg.color }} />}

                              {/* Entry dot (no mood, past day) */}
                              {!cfg && !day.isToday && day.hasEntry && (
                                <div className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
                              )}
                            </div>

                            {/* Day label + date number */}
                            <div className="flex flex-col items-center leading-none gap-0.5">
                              <span className="text-[9px] font-inter font-semibold" style={{ color: day.isToday ? "var(--color-accent)" : "var(--color-ink-faint)" }}>
                                {day.label}
                              </span>
                              <span className="text-[9px] font-inter" style={{ color: "var(--color-ink-faint)" }}>
                                {day.date}
                              </span>
                            </div>

                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 pt-3 flex flex-wrap gap-x-3 gap-y-1" style={{ borderTop: "1px solid var(--color-border)" }}>
                      {(Object.entries(MOOD_CONFIG) as [Mood, { label: string; color: string }][]).map(([, cfg]) => (
                        <span key={cfg.label} className="flex items-center gap-1 text-[10px] font-inter text-ink-faint">
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.color }} />
                          {cfg.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <MoodCalendar />
                )}
              </motion.div>

              {/* Goals tags — only shown if user completed onboarding */}
              {goals.length > 0 && (
                <motion.div variants={item}>
                  <h2 className="text-xs font-inter font-semibold text-ink-faint uppercase tracking-widest mb-3">
                    Your focus areas
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {goals.map((g) => {
                      const labels: Record<string, string> = {
                        mental_clarity:      "Mental clarity",
                        emotional_wellbeing: "Emotional wellbeing",
                        personal_growth:     "Personal growth",
                        creativity:          "Creativity",
                        gratitude:           "Gratitude",
                        habit_tracking:      "Habit tracking",
                      }
                      return (
                        <span
                          key={g}
                          className="text-[11px] font-inter font-medium px-2.5 py-1 rounded-full"
                          style={{
                            background: "var(--color-surface-2)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-ink-muted)",
                          }}
                        >
                          {labels[g] ?? g}
                        </span>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Quick actions */}
              <motion.div variants={item}>
                <h2 className="text-xs font-inter font-semibold text-ink-faint uppercase tracking-widest mb-3">
                  Quick actions
                </h2>
                <div className="flex flex-col gap-2">
                  {ACTIONS.map(({ href, Icon, label, sub }) => (
                    <Link href={href} key={href} className="group block">
                      <div
                        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface transition-colors duration-150 group-hover:bg-surface-2"
                        style={{ border: "1px solid var(--color-border)" }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "var(--color-surface-2)" }}
                        >
                          <Icon />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-inter font-semibold text-ink leading-snug">{label}</p>
                          <p className="text-xs font-inter text-ink-faint mt-0.5">{sub}</p>
                        </div>
                        <IconChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>

            </div>
          </div>
        </motion.div>
      </main>
    </>)}
    </motion.div>
    </>
  )
}
