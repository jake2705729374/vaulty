"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { QUOTE_CATEGORIES, type QuoteCategory } from "@/lib/quotes"

// ── Types ─────────────────────────────────────────────────────────────────
type Goal = "mental_clarity" | "emotional_wellbeing" | "personal_growth" | "creativity" | "gratitude" | "habit_tracking"
type Frequency = "daily" | "few_times_week" | "weekly" | "whenever"
type ColorTheme = "VAULT" | "PARCHMENT" | "SLATE" | "ROSE" | "FOREST" | "MIDNIGHT"
type Relationship = "Friend" | "Partner" | "Family" | "Colleague"
type LifePhase = "Student" | "Professional" | "Parent" | "Caregiver" | "Major Transition" | "Retired"

interface CoachPerson {
  name:         string
  relationship: string   // stored as specific value: "Friend", "Mother", "Father", etc.
  birthday?:    string   // "MM/DD"
  closeness?:   string   // "very_close" | "close" | "complicated"
  traits?:      string[]
  notes?:       string
}

// ── SVG Icons (Heroicons 2 outline) ───────────────────────────────────────
function IconBolt({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  )
}
function IconHeart({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  )
}
function IconArrowUp({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  )
}
function IconSparkles({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  )
}
function IconStar({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
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
function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}
function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}
function IconArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────
const GOALS: { id: Goal; label: string; sub: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "mental_clarity",     label: "Mental clarity",     sub: "Clear my mind and think better",   Icon: IconBolt },
  { id: "emotional_wellbeing",label: "Emotional wellbeing",sub: "Process feelings and reduce stress", Icon: IconHeart },
  { id: "personal_growth",    label: "Personal growth",    sub: "Track progress and set intentions",  Icon: IconArrowUp },
  { id: "creativity",         label: "Creativity",         sub: "Capture ideas and inspiration",      Icon: IconSparkles },
  { id: "gratitude",          label: "Gratitude",          sub: "Build a daily gratitude practice",   Icon: IconStar },
  { id: "habit_tracking",     label: "Habit tracking",     sub: "Stay consistent with my goals",      Icon: IconCheckCircle },
]

const FREQUENCIES: { id: Frequency; label: string; sub: string }[] = [
  { id: "daily",           label: "Every day",              sub: "Build a daily writing habit" },
  { id: "few_times_week",  label: "A few times a week",     sub: "Regular but flexible" },
  { id: "weekly",          label: "Once a week",            sub: "A weekly check-in" },
  { id: "whenever",        label: "Whenever inspiration strikes", sub: "No pressure, no schedule" },
]

const THEMES: { value: ColorTheme; label: string; bg: string; accent: string }[] = [
  { value: "VAULT",     label: "Default",   bg: "#0A0A0F", accent: "#2563EB" },
  { value: "PARCHMENT", label: "Parchment", bg: "#faf7f2", accent: "#92400e" },
  { value: "SLATE",     label: "Slate",     bg: "#f8fafc", accent: "#475569" },
  { value: "ROSE",      label: "Rose",      bg: "#fff5f5", accent: "#be123c" },
  { value: "FOREST",    label: "Forest",    bg: "#f0fdf4", accent: "#166534" },
  { value: "MIDNIGHT",  label: "Midnight",  bg: "#f5f3ff", accent: "#6d28d9" },
]

const RELATIONSHIPS: Relationship[] = ["Friend", "Partner", "Family", "Colleague"]

const FAMILY_SUB_TYPES = [
  "Mother", "Father", "Sister", "Brother",
  "Grandparent", "Aunt/Uncle", "Cousin", "Other",
]

const LIFE_PHASES: LifePhase[] = [
  "Student", "Professional", "Parent", "Caregiver", "Major Transition", "Retired",
]

const SITUATIONS = [
  "New job", "Breakup", "Grief", "Health journey",
  "Celebration", "Stress", "Major decision", "Relationship change",
]

const PERSON_TRAITS = [
  "Supportive", "Funny", "Caring", "Ambitious", "Sensitive",
  "Direct", "Creative", "Adventurous", "Reserved", "Loyal", "Energetic", "Analytical",
]

const CLOSENESS_LEVELS = [
  { value: "very_close",  label: "Very close"  },
  { value: "close",       label: "Close"       },
  { value: "complicated", label: "Complicated" },
]

const TOTAL_STEPS = 7

// ── Slide animation ───────────────────────────────────────────────────────
const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40, transition: { duration: 0.2, ease: "easeIn" as const } }),
}

// ── Component ─────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { status } = useSession()
  const router = useRouter()

  const [step, setStep]           = useState(1)
  const [dir, setDir]             = useState(1)
  const [saving, setSaving]       = useState(false)
  const [checking, setChecking]   = useState(true)

  // Form state
  const [name, setName]                     = useState("")
  const [goals, setGoals]                   = useState<Goal[]>([])
  const [frequency, setFrequency]           = useState<Frequency | null>(null)
  const [theme, setTheme]                   = useState<ColorTheme>("VAULT")
  const [quoteCategories, setQuoteCategories] = useState<QuoteCategory[]>([])

  // Coach profile state
  const [people,              setPeople]              = useState<CoachPerson[]>([])
  const [newPersonName,       setNewPersonName]       = useState("")
  const [newPersonRel,        setNewPersonRel]        = useState<Relationship>("Friend")
  const [newPersonFamSub,     setNewPersonFamSub]     = useState("Mother")
  const [newPersonFamOther,   setNewPersonFamOther]   = useState("")
  const [expandedPersonIdx,   setExpandedPersonIdx]   = useState<number | null>(null)
  const [lifePhase,           setLifePhase]           = useState<LifePhase | null>(null)
  const [situations,          setSituations]          = useState<string[]>([])

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  // Check if onboarding already done
  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/user/preferences")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.onboardingDone) {
          router.replace("/dashboard")
        } else {
          if (data?.displayName) setName(data.displayName)
          if (data?.colorTheme)  setTheme(data.colorTheme as ColorTheme)
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [status, router])

  function goNext() {
    setDir(1)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function goBack() {
    setDir(-1)
    setStep((s) => Math.max(s - 1, 1))
  }

  function toggleGoal(g: Goal) {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  function toggleQuoteCat(c: QuoteCategory) {
    setQuoteCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  function getEffectiveRelationship(): string {
    if (newPersonRel === "Family") {
      if (newPersonFamSub === "Other") return newPersonFamOther.trim() || "Family member"
      return newPersonFamSub
    }
    return newPersonRel
  }

  function addPerson() {
    const trimmed = newPersonName.trim()
    if (!trimmed || people.length >= 8) return
    setPeople((prev) => [...prev, { name: trimmed, relationship: getEffectiveRelationship() }])
    setNewPersonName("")
    setNewPersonFamOther("")
  }

  function removePerson(idx: number) {
    setPeople((prev) => prev.filter((_, i) => i !== idx))
    if (expandedPersonIdx === idx) setExpandedPersonIdx(null)
  }

  function updatePersonDetail(idx: number, field: string, value: unknown) {
    setPeople((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  function togglePersonTrait(idx: number, trait: string) {
    setPeople((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p
        const traits = p.traits ?? []
        const next = traits.includes(trait) ? traits.filter((t) => t !== trait) : [...traits, trait]
        return { ...p, traits: next }
      })
    )
  }

  function toggleSituation(s: string) {
    setSituations((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  async function handleFinish() {
    setSaving(true)
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName:         name.trim() || null,
          journalingGoals:     JSON.stringify(goals),
          journalingFrequency: frequency,
          colorTheme:          theme,
          quoteCategories:     JSON.stringify(quoteCategories),
          coachPeople:         JSON.stringify(people),
          coachLifeContext:    JSON.stringify({ phase: lifePhase, situations }),
          onboardingDone:      true,
        }),
      })
    } catch {
      // proceed anyway
    }
    router.push("/dashboard")
  }

  if (status === "loading" || checking) return null

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "#0A0A0F", fontFamily: "var(--font-inter)" }}
    >
      {/* Background orb */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md flex flex-col gap-6"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mx-auto">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}
          >
            V
          </div>
          <span
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
          >
            Vaultly
          </span>
        </Link>

        {/* Card */}
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Progress bar */}
          <div className="h-0.5 w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full"
              style={{ background: "linear-gradient(90deg, #2563EB, #3B82F6)" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>

          {/* Step counter */}
          <div className="px-8 pt-6 flex items-center justify-between">
            <span style={{ color: "#8B8BA7", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Step {step} of {TOTAL_STEPS}
            </span>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ color: "#8B8BA7", fontSize: "12px" }}
              className="hover:text-white transition-colors duration-150"
            >
              Skip for now
            </button>
          </div>

          {/* Step content */}
          <div className="px-8 pb-8 pt-5 min-h-[360px] flex flex-col">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex-1 flex flex-col"
              >
                {/* ── Step 1: Name ────────────────────────────── */}
                {step === 1 && (
                  <div className="flex flex-col gap-6 flex-1">
                    <div>
                      <h1
                        className="text-2xl font-bold leading-snug"
                        style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
                      >
                        What should we call you?
                      </h1>
                      <p className="text-sm mt-1.5" style={{ color: "#8B8BA7" }}>
                        This is how your vault will greet you each day.
                      </p>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your first name or nickname"
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#F0F0F0",
                        fontFamily: "var(--font-inter)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      onKeyDown={(e) => e.key === "Enter" && goNext()}
                    />
                    <p className="text-xs mt-auto" style={{ color: "#555570" }}>
                      You can always change this later in settings.
                    </p>
                  </div>
                )}

                {/* ── Step 2: Goals ───────────────────────────── */}
                {step === 2 && (
                  <div className="flex flex-col gap-5 flex-1">
                    <div>
                      <h1
                        className="text-2xl font-bold leading-snug"
                        style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
                      >
                        Why do you journal?
                      </h1>
                      <p className="text-sm mt-1.5" style={{ color: "#8B8BA7" }}>
                        Select all that apply — we&rsquo;ll personalise your experience.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {GOALS.map(({ id, label, sub, Icon }) => {
                        const selected = goals.includes(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleGoal(id)}
                            className="flex flex-col gap-2 p-3.5 rounded-xl text-left transition-all duration-150"
                            style={{
                              background: selected ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${selected ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.08)"}`,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span style={{ color: selected ? "#93B4FF" : "#8B8BA7" }}>
                                <Icon className="w-4 h-4" />
                              </span>
                              {selected && (
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{ background: "#2563EB" }}
                                >
                                  <IconCheck className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold leading-snug" style={{ color: selected ? "#F0F0F0" : "#C0C0D0" }}>
                                {label}
                              </p>
                              <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "#8B8BA7" }}>
                                {sub}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 3: Frequency ───────────────────────── */}
                {step === 3 && (
                  <div className="flex flex-col gap-5 flex-1">
                    <div>
                      <h1
                        className="text-2xl font-bold leading-snug"
                        style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
                      >
                        How often do you plan to write?
                      </h1>
                      <p className="text-sm mt-1.5" style={{ color: "#8B8BA7" }}>
                        We&rsquo;ll tailor your streak goals and reminders to match.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {FREQUENCIES.map(({ id, label, sub }) => {
                        const selected = frequency === id
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setFrequency(id)}
                            className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-150"
                            style={{
                              background: selected ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${selected ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.08)"}`,
                            }}
                          >
                            {/* Radio circle */}
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-150"
                              style={{
                                border: `2px solid ${selected ? "#2563EB" : "rgba(255,255,255,0.2)"}`,
                                background: selected ? "#2563EB" : "transparent",
                              }}
                            >
                              {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold leading-snug" style={{ color: selected ? "#F0F0F0" : "#C0C0D0" }}>
                                {label}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: "#8B8BA7" }}>{sub}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 4: Theme ───────────────────────────── */}
                {step === 4 && (
                  <div className="flex flex-col gap-6 flex-1">
                    <div>
                      <h1
                        className="text-2xl font-bold leading-snug"
                        style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
                      >
                        Pick your vault&rsquo;s look
                      </h1>
                      <p className="text-sm mt-1.5" style={{ color: "#8B8BA7" }}>
                        You can always change this from settings.
                      </p>
                    </div>
                    <div className="flex gap-4 flex-wrap justify-center">
                      {THEMES.map((t) => {
                        const selected = theme === t.value
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setTheme(t.value)}
                            className="flex flex-col items-center gap-2 focus:outline-none"
                            aria-label={t.label}
                          >
                            <div
                              className="w-14 h-14 rounded-full transition-all duration-200"
                              style={{
                                background: t.bg,
                                border: `3px solid ${selected ? t.accent : "transparent"}`,
                                boxShadow: selected
                                  ? `0 0 0 2px ${t.accent}, 0 4px 12px rgba(0,0,0,0.3)`
                                  : "0 0 0 1px rgba(255,255,255,0.1)",
                              }}
                            >
                              {selected && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span style={{ color: t.accent }}>
                                    <IconCheck className="w-4 h-4" />
                                  </span>
                                </div>
                              )}
                            </div>
                            <span
                              className="text-xs font-medium"
                              style={{ color: selected ? "#F0F0F0" : "#8B8BA7" }}
                            >
                              {t.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 5: Quote categories ─────────────────── */}
                {step === 5 && (
                  <div className="flex flex-col gap-5 flex-1">
                    <div>
                      <h1
                        className="text-2xl font-bold leading-snug"
                        style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
                      >
                        What kind of quotes inspire you?
                      </h1>
                      <p className="text-sm mt-1.5" style={{ color: "#8B8BA7" }}>
                        We&rsquo;ll show you a daily quote to start your sessions.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {QUOTE_CATEGORIES.map(({ id, label, sub }) => {
                        const selected = quoteCategories.includes(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleQuoteCat(id)}
                            className="flex flex-col gap-2 p-3.5 rounded-xl text-left transition-all duration-150"
                            style={{
                              background: selected ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${selected ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.08)"}`,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span style={{ color: selected ? "#93B4FF" : "#8B8BA7", fontSize: "14px" }}>❝</span>
                              {selected && (
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{ background: "#2563EB" }}
                                >
                                  <IconCheck className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold leading-snug" style={{ color: selected ? "#F0F0F0" : "#C0C0D0" }}>
                                {label}
                              </p>
                              <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "#8B8BA7" }}>
                                {sub}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Summary preview */}
                    <div
                      className="mt-auto rounded-xl p-4 text-sm space-y-1.5"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {name && (
                        <p style={{ color: "#8B8BA7" }}>
                          <span style={{ color: "#F0F0F0" }}>Name: </span>{name}
                        </p>
                      )}
                      {goals.length > 0 && (
                        <p style={{ color: "#8B8BA7" }}>
                          <span style={{ color: "#F0F0F0" }}>Goals: </span>
                          {goals.map((g) => GOALS.find((x) => x.id === g)?.label).join(", ")}
                        </p>
                      )}
                      {frequency && (
                        <p style={{ color: "#8B8BA7" }}>
                          <span style={{ color: "#F0F0F0" }}>Frequency: </span>
                          {FREQUENCIES.find((f) => f.id === frequency)?.label}
                        </p>
                      )}
                      {quoteCategories.length > 0 && (
                        <p style={{ color: "#8B8BA7" }}>
                          <span style={{ color: "#F0F0F0" }}>Quotes: </span>
                          {quoteCategories.map((c) => QUOTE_CATEGORIES.find((x) => x.id === c)?.label).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Step 6: People ───────────────────────────── */}
                {step === 6 && (
                  <div className="flex flex-col gap-5 flex-1">
                    <div>
                      <h1
                        className="text-2xl font-bold leading-snug"
                        style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
                      >
                        Who are the key people in your life?
                      </h1>
                      <p className="text-sm mt-1.5" style={{ color: "#8B8BA7" }}>
                        Your coach will ask about them by name. Add up to 8 people.
                      </p>
                    </div>

                    {/* Add person form */}
                    <div className="flex flex-col gap-2.5">
                      <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="Their name"
                        maxLength={40}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#F0F0F0",
                          fontFamily: "var(--font-inter)",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                        onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                        onKeyDown={(e) => e.key === "Enter" && addPerson()}
                      />

                      {/* Relationship dropdown */}
                      <div className="relative">
                        <select
                          value={newPersonRel}
                          onChange={(e) => setNewPersonRel(e.target.value as Relationship)}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none cursor-pointer pr-10"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#F0F0F0",
                            fontFamily: "var(--font-inter)",
                          }}
                        >
                          {RELATIONSHIPS.map((rel) => (
                            <option key={rel} value={rel} style={{ background: "#111122", color: "#F0F0F0" }}>
                              {rel}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8B8BA7" }}>▾</span>
                      </div>

                      {/* Family sub-type dropdown */}
                      {newPersonRel === "Family" && (
                        <>
                          <div className="relative">
                            <select
                              value={newPersonFamSub}
                              onChange={(e) => setNewPersonFamSub(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none cursor-pointer pr-10"
                              style={{
                                background: "rgba(37,99,235,0.08)",
                                border: "1px solid rgba(37,99,235,0.25)",
                                color: "#93B4FF",
                                fontFamily: "var(--font-inter)",
                              }}
                            >
                              {FAMILY_SUB_TYPES.map((sub) => (
                                <option key={sub} value={sub} style={{ background: "#111122", color: "#F0F0F0" }}>
                                  {sub}
                                </option>
                              ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#93B4FF" }}>▾</span>
                          </div>
                          {newPersonFamSub === "Other" && (
                            <input
                              type="text"
                              value={newPersonFamOther}
                              onChange={(e) => setNewPersonFamOther(e.target.value)}
                              placeholder="e.g. Stepmother, Godfather…"
                              maxLength={30}
                              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                              style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#F0F0F0",
                                fontFamily: "var(--font-inter)",
                              }}
                            />
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={addPerson}
                        disabled={!newPersonName.trim() || people.length >= 8}
                        className="self-start px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff", boxShadow: "0 0 16px rgba(37,99,235,0.3)" }}
                      >
                        + Add person
                      </button>
                    </div>

                    {/* People profile cards — expandable */}
                    {people.length > 0 && (
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-0.5">
                        {people.map((p, i) => {
                          const isExpanded = expandedPersonIdx === i
                          return (
                            <div
                              key={i}
                              className="rounded-xl overflow-hidden"
                              style={{
                                background: "rgba(37,99,235,0.06)",
                                border: `1px solid ${isExpanded ? "rgba(37,99,235,0.5)" : "rgba(37,99,235,0.2)"}`,
                                transition: "border-color 0.15s",
                              }}
                            >
                              {/* Card header */}
                              <button
                                type="button"
                                onClick={() => setExpandedPersonIdx(isExpanded ? null : i)}
                                className="w-full flex items-center justify-between px-4 py-3 text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: "rgba(37,99,235,0.25)", color: "#93B4FF" }}
                                  >
                                    {p.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold leading-tight" style={{ color: "#F0F0F0" }}>{p.name}</p>
                                    <p className="text-xs mt-0.5" style={{ color: "#8B8BA7" }}>{p.relationship}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {p.birthday && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#8B8BA7" }}>🎂</span>}
                                  {p.closeness && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#8B8BA7" }}>{CLOSENESS_LEVELS.find(c => c.value === p.closeness)?.label}</span>}
                                  <svg
                                    viewBox="0 0 20 20" fill="currentColor" width="13" height="13"
                                    style={{ color: "#555570", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                                  >
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd"/>
                                  </svg>
                                </div>
                              </button>

                              {/* Expanded details */}
                              {isExpanded && (
                                <div
                                  className="px-4 pb-4 space-y-3.5 border-t"
                                  style={{ borderColor: "rgba(37,99,235,0.2)" }}
                                >
                                  {/* Birthday */}
                                  <div className="pt-3">
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#555570" }}>Birthday (MM/DD)</label>
                                    <input
                                      type="text"
                                      value={p.birthday ?? ""}
                                      onChange={(e) => updatePersonDetail(i, "birthday", e.target.value)}
                                      placeholder="e.g. 03/15"
                                      maxLength={5}
                                      className="w-28 px-3 py-1.5 rounded-lg text-sm outline-none"
                                      style={{
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#F0F0F0",
                                        fontFamily: "var(--font-inter)",
                                      }}
                                    />
                                  </div>

                                  {/* Closeness */}
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#555570" }}>Closeness</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {CLOSENESS_LEVELS.map((level) => {
                                        const selected = p.closeness === level.value
                                        return (
                                          <button
                                            key={level.value}
                                            type="button"
                                            onClick={() => updatePersonDetail(i, "closeness", selected ? undefined : level.value)}
                                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                                            style={{
                                              background: selected ? "rgba(37,99,235,0.3)" : "rgba(255,255,255,0.04)",
                                              border: `1px solid ${selected ? "rgba(37,99,235,0.6)" : "rgba(255,255,255,0.1)"}`,
                                              color: selected ? "#93B4FF" : "#8B8BA7",
                                            }}
                                          >
                                            {level.label}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>

                                  {/* Traits */}
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#555570" }}>Personality traits</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {PERSON_TRAITS.map((trait) => {
                                        const selected = (p.traits ?? []).includes(trait)
                                        return (
                                          <button
                                            key={trait}
                                            type="button"
                                            onClick={() => togglePersonTrait(i, trait)}
                                            className="px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150"
                                            style={{
                                              background: selected ? "rgba(37,99,235,0.3)" : "rgba(255,255,255,0.04)",
                                              border: `1px solid ${selected ? "rgba(37,99,235,0.6)" : "rgba(255,255,255,0.1)"}`,
                                              color: selected ? "#93B4FF" : "#8B8BA7",
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
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#555570" }}>Notes for your coach</label>
                                    <textarea
                                      value={p.notes ?? ""}
                                      onChange={(e) => updatePersonDetail(i, "notes", e.target.value)}
                                      placeholder="Anything your coach should know…"
                                      maxLength={300}
                                      rows={2}
                                      className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                                      style={{
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#F0F0F0",
                                        fontFamily: "var(--font-inter)",
                                      }}
                                    />
                                    <p className="text-[10px] text-right mt-0.5" style={{ color: "#555570" }}>{(p.notes ?? "").length}/300</p>
                                  </div>

                                  {/* Remove */}
                                  <button
                                    type="button"
                                    onClick={() => removePerson(i)}
                                    className="text-xs transition-colors"
                                    style={{ color: "#555570" }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                                    onMouseLeave={(e) => e.currentTarget.style.color = "#555570"}
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

                    <p className="text-xs mt-auto" style={{ color: "#555570" }}>
                      You can add or edit people in Settings → Coach Profile.
                    </p>
                  </div>
                )}

                {/* ── Step 7: Life context ─────────────────────── */}
                {step === 7 && (
                  <div className="flex flex-col gap-5 flex-1">
                    <div>
                      <h1
                        className="text-2xl font-bold leading-snug"
                        style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
                      >
                        What are you currently navigating?
                      </h1>
                      <p className="text-sm mt-1.5" style={{ color: "#8B8BA7" }}>
                        This helps your coach understand where you&rsquo;re at right now.
                      </p>
                    </div>

                    {/* Life phase */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#555570" }}>
                        Your current life phase
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {LIFE_PHASES.map((phase) => {
                          const selected = lifePhase === phase
                          return (
                            <button
                              key={phase}
                              type="button"
                              onClick={() => setLifePhase(selected ? null : phase)}
                              className="px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-150"
                              style={{
                                background: selected ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.03)",
                                border: `1px solid ${selected ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.08)"}`,
                                color: selected ? "#F0F0F0" : "#C0C0D0",
                              }}
                            >
                              {phase}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Situations */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#555570" }}>
                        What&rsquo;s going on? (select all that apply)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SITUATIONS.map((s) => {
                          const selected = situations.includes(s)
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => toggleSituation(s)}
                              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                              style={{
                                background: selected ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.03)",
                                border: `1px solid ${selected ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.08)"}`,
                                color: selected ? "#93B4FF" : "#8B8BA7",
                              }}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <p className="text-xs mt-auto" style={{ color: "#555570" }}>
                      Both are optional — skip if you&rsquo;re not sure yet.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation footer */}
          <div
            className="px-8 pb-7 flex items-center gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.25rem" }}
          >
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
                style={{
                  color: "#8B8BA7",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <IconArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <div className="flex-1" />

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", boxShadow: "0 0 20px rgba(37,99,235,0.35)" }}
              >
                Continue
                <IconArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", boxShadow: "0 0 20px rgba(37,99,235,0.35)" }}
              >
                {saving ? "Setting up your vault…" : "Enter my vault"}
                {!saving && <IconArrowRight className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  )
}
