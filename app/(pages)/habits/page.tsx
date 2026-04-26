"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import HabitsProgress from "@/components/HabitsProgress"

// ── Types ─────────────────────────────────────────────────────────────────
interface HabitLog { id: string; date: string }
interface Habit {
  id: string
  name: string
  description: string | null
  color: string
  order: number
  logs: HabitLog[]
}

// ── Constants ─────────────────────────────────────────────────────────────
const COLOR_PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
]

// ── Icons ─────────────────────────────────────────────────────────────────
function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function IconChevronLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function IconPencil({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
      <path d="M19.5 7.125" />
    </svg>
  )
}

function IconSparkles({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  )
}

function IconFire({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  )
}

function IconCheck({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

// ── Helper functions ───────────────────────────────────────────────────────

// Use local date (not UTC) so habits reset at local midnight, not UTC midnight
function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const today = localIso(new Date())

function getStreak(logs: HabitLog[]): number {
  const logSet = new Set(logs.map(l => l.date))
  let streak = 0
  const d = new Date()
  while (true) {
    const dateStr = localIso(d)
    if (!logSet.has(dateStr)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return localIso(d)
  })
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return localIso(d)
  })
}

function get30DayPct(logs: HabitLog[]): number {
  const logSet = new Set(logs.map(l => l.date))
  const days = getLast30Days()
  const completed = days.filter(d => logSet.has(d)).length
  return Math.round((completed / 30) * 100)
}

// ── Completion Ring SVG ────────────────────────────────────────────────────
function CompletionRing({ pct, color }: { pct: number; color: string }) {
  const radius = 16
  const circumference = 2 * Math.PI * radius // ≈ 100.53
  const dashOffset = circumference * (1 - pct / 100)
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      <circle
        cx="20" cy="20" r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="3"
      />
      <circle
        cx="20" cy="20" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text
        x="20" y="24"
        textAnchor="middle"
        fontSize="8"
        fontFamily="var(--font-sora, sans-serif)"
        fontWeight="700"
        fill="var(--color-ink)"
      >
        {pct}%
      </text>
    </svg>
  )
}

// ── Add Habit Modal ────────────────────────────────────────────────────────
interface AddModalProps {
  onClose: () => void
  onCreated: (habit: Habit) => void
  onUpdated: (id: string, name: string, description: string | null, color: string) => void
  existingCount: number
}

function AddModal({ onClose, onCreated, onUpdated, existingCount }: AddModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#6366f1")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [isCreated, setIsCreated] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const pendingIdRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  function scheduleAutoSave(n: string, d: string, c: string) {
    if (!n.trim()) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveStatus("saving")
    timerRef.current = setTimeout(async () => {
      if (savingRef.current) return
      savingRef.current = true
      try {
        const existingId = pendingIdRef.current
        if (!existingId) {
          const res = await fetch("/api/habits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: n.trim(), description: d.trim() || undefined, color: c }),
          })
          if (res.ok) {
            const data = await res.json()
            pendingIdRef.current = data.habit.id
            setIsCreated(true)
            onCreated(data.habit)
            setSaveStatus("saved")
          } else {
            setSaveStatus("error")
          }
        } else {
          await fetch(`/api/habits/${existingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: n.trim(), description: d.trim() || null, color: c }),
          })
          onUpdated(existingId, n.trim(), d.trim() || null, c)
          setSaveStatus("saved")
        }
      } catch {
        setSaveStatus("error")
      } finally {
        savingRef.current = false
      }
    }, 800)
  }

  async function handleDone() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!pendingIdRef.current && name.trim()) {
      // Immediate POST
      try {
        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, color }),
        })
        if (res.ok) {
          const data = await res.json()
          onCreated(data.habit)
        }
      } catch {
        // best effort
      }
    }
    onClose()
  }

  if (existingCount >= 10) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="relative w-full max-w-sm rounded-2xl p-6 shadow-xl"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-sm font-inter" style={{ color: "var(--color-ink-muted)" }}>
            You&apos;ve reached the maximum of 10 habits.
          </p>
          <button
            onClick={onClose}
            className="mt-4 h-10 px-4 rounded-xl text-sm font-inter font-medium"
            style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-ink)" }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-xl"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-lg leading-none"
          style={{ color: "var(--color-ink-faint)", backgroundColor: "var(--color-surface-2)" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-ink)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-base font-sora font-semibold text-ink">New habit</h2>
          {saveStatus !== "idle" && (
            <span
              className="text-xs font-inter"
              style={{
                color:
                  saveStatus === "saved"
                    ? "#22c55e"
                    : saveStatus === "saving"
                    ? "var(--color-ink-faint)"
                    : "#ef4444",
              }}
            >
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "✓ Saved" : "Save failed"}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-inter font-medium mb-1.5" style={{ color: "var(--color-ink-muted)" }}>
              Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                scheduleAutoSave(e.target.value, description, color)
              }}
              placeholder="e.g. Morning meditation"
              maxLength={80}
              className="w-full h-10 px-3 rounded-xl text-sm font-inter outline-none transition-all"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-ink)",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-inter font-medium mb-1.5" style={{ color: "var(--color-ink-muted)" }}>
              Description <span className="font-normal" style={{ color: "var(--color-ink-faint)" }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                scheduleAutoSave(name, e.target.value, color)
              }}
              placeholder="Why does this habit matter to you?"
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 rounded-xl text-sm font-inter outline-none transition-all resize-none"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-ink)",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-inter font-medium mb-2" style={{ color: "var(--color-ink-muted)" }}>
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c)
                    scheduleAutoSave(name, description, c)
                  }}
                  className="w-7 h-7 rounded-full transition-transform"
                  style={{
                    backgroundColor: c,
                    transform: color === c ? "scale(1.2)" : "scale(1)",
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl text-sm font-inter font-medium transition-colors"
              style={{
                backgroundColor: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-ink)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-border)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={!name.trim()}
              className="flex-1 h-10 rounded-xl text-sm font-inter font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {isCreated ? "Done" : "Add habit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function HabitsPage() {
  const { status } = useSession()
  const router = useRouter()

  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "progress">("overview")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editColor, setEditColor] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [insights, setInsights] = useState<string | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Auto-save for inline edit form
  const editSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editSavingRef = useRef(false)
  const [editSaveStatus, setEditSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/habits")
      .then(r => r.ok ? r.json() : { habits: [] })
      .then(data => setHabits(data.habits ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  // ── Toggle completion ────────────────────────────────────────────────────
  const handleToggle = useCallback(async (habitId: string) => {
    if (togglingIds.has(habitId)) return
    setTogglingIds(prev => new Set([...prev, habitId]))
    const habit = habits.find(h => h.id === habitId)
    if (!habit) {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(habitId); return n })
      return
    }
    const logSet = new Set(habit.logs.map(l => l.date))
    const hadToday = logSet.has(today)

    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h
      return {
        ...h,
        logs: hadToday
          ? h.logs.filter(l => l.date !== today)
          : [...h.logs, { id: "temp", date: today }],
      }
    }))

    try {
      await fetch(`/api/habits/${habitId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      })
    } catch {
      setHabits(prev => prev.map(h => {
        if (h.id !== habitId) return h
        return {
          ...h,
          logs: hadToday
            ? [...h.logs, { id: "temp", date: today }]
            : h.logs.filter(l => l.date !== today),
        }
      }))
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(habitId); return n })
    }
  }, [habits, togglingIds])

  // ── Add habit (new modal callbacks) ──────────────────────────────────────
  function handleCreated(habit: Habit) {
    setHabits(prev => [...prev, { ...habit, logs: habit.logs ?? [] }])
  }

  function handleUpdated(id: string, name: string, description: string | null, color: string) {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, name, description, color } : h))
  }

  // ── Edit habit (inline, with auto-save) ──────────────────────────────────
  function startEdit(habit: Habit) {
    setEditingId(habit.id)
    setEditName(habit.name)
    setEditDescription(habit.description ?? "")
    setEditColor(habit.color)
    setEditSaveStatus("idle")
  }

  function scheduleEditAutoSave(id: string, name: string, desc: string, color: string) {
    if (!name.trim()) return
    if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current)
    setEditSaveStatus("saving")
    editSaveTimerRef.current = setTimeout(async () => {
      if (editSavingRef.current) return
      editSavingRef.current = true
      try {
        const res = await fetch(`/api/habits/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: desc.trim() || null, color }),
        })
        if (res.ok) {
          setHabits(prev =>
            prev.map(h =>
              h.id === id
                ? { ...h, name: name.trim(), description: desc.trim() || null, color }
                : h
            )
          )
          setEditSaveStatus("saved")
        } else {
          setEditSaveStatus("error")
        }
      } catch {
        setEditSaveStatus("error")
      } finally {
        editSavingRef.current = false
      }
    }, 800)
  }

  // Keep the old handleSaveEdit for backwards compat (unused with new Done button but kept to avoid dead code issues)
  async function handleSaveEdit(habitId: string) {
    if (!editName.trim()) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), description: editDescription.trim(), color: editColor }),
      })
      if (res.ok) {
        setHabits(prev => prev.map(h =>
          h.id === habitId
            ? { ...h, name: editName.trim(), description: editDescription.trim() || null, color: editColor }
            : h
        ))
        setEditingId(null)
      }
    } finally {
      setSavingEdit(false)
    }
  }
  // Silence unused warning
  void handleSaveEdit

  // ── Delete habit ─────────────────────────────────────────────────────────
  async function handleDelete(habitId: string) {
    setDeletingId(habitId)
    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: "DELETE" })
      if (res.ok) {
        setHabits(prev => prev.filter(h => h.id !== habitId))
        setExpandedId(null)
        setDeleteConfirmId(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  // ── AI Insights ───────────────────────────────────────────────────────────
  async function handleGetInsights() {
    if (insightsLoading) return
    setInsightsLoading(true)
    try {
      const res = await fetch("/api/habits/insights", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights ?? data.message ?? "No insights available.")
      }
    } catch {
      setInsights("Unable to load insights. Please try again.")
    } finally {
      setInsightsLoading(false)
    }
  }

  // ── Session guard ────────────────────────────────────────────────────────
  if (status === "loading") return null

  const todayFormatted = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Row 1: back link | title | new habit button */}
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm font-inter transition-colors h-9 px-2 rounded-lg shrink-0"
              style={{ color: "var(--color-ink-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-ink)"
                e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-ink-muted)"
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <IconChevronLeft />
              Dashboard
            </Link>
            <div className="w-px h-5 shrink-0" style={{ backgroundColor: "var(--color-border)" }} />
            <h1 className="text-lg font-sora font-semibold text-ink truncate">Habits</h1>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-inter font-semibold text-white shrink-0 transition-opacity hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New habit</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Row 2: tab bar */}
        <div
          className="max-w-screen-xl mx-auto px-4 md:px-8 flex border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          {(["overview", "progress"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-1 py-2.5 text-sm font-inter font-medium mr-6 transition-colors"
              style={{
                color: activeTab === tab ? "var(--color-accent)" : "var(--color-ink-muted)",
                borderBottom: activeTab === tab ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
            >
              {tab === "overview" ? "Overview" : "Progress"}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 space-y-10">

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* ── Overview tab ──────────────────────────────────────────────── */}
        {!loading && activeTab === "overview" && (
          <>
            {/* ── Section 1: Today's Check-in ─────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xs font-inter font-semibold uppercase tracking-widest" style={{ color: "var(--color-ink-faint)" }}>
                    Today
                  </h2>
                  <p className="text-sm font-inter mt-0.5" style={{ color: "var(--color-ink-muted)" }}>
                    {todayFormatted}
                  </p>
                </div>
                {habits.length > 0 && (
                  <span className="text-xs font-inter" style={{ color: "var(--color-ink-faint)" }}>
                    {habits.filter(h => h.logs.some(l => l.date === today)).length} / {habits.length} done
                  </span>
                )}
              </div>

              {habits.length === 0 ? (
                <div
                  className="rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center"
                  style={{ border: "1px dashed var(--color-border)" }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--color-surface-2)" }}>
                    <IconCheck className="w-6 h-6" style={{ color: "var(--color-ink-faint)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-sora font-semibold text-ink">No habits yet</p>
                    <p className="text-xs font-inter mt-1" style={{ color: "var(--color-ink-faint)" }}>
                      Add your first habit to start tracking.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-inter font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  >
                    <IconPlus className="w-3.5 h-3.5" />
                    Add a habit
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {habits.map(habit => {
                    const isDone = habit.logs.some(l => l.date === today)
                    const streak = getStreak(habit.logs)
                    const isToggling = togglingIds.has(habit.id)
                    return (
                      <button
                        key={habit.id}
                        onClick={() => handleToggle(habit.id)}
                        disabled={isToggling}
                        className="text-left rounded-2xl p-3 transition-all duration-150 cursor-pointer disabled:opacity-60"
                        style={{
                          backgroundColor: isDone ? `${habit.color}18` : "var(--color-surface)",
                          border: `1px solid ${isDone ? `${habit.color}60` : "var(--color-border)"}`,
                        }}
                        onMouseEnter={(e) => {
                          if (!isDone) e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isDone ? `${habit.color}18` : "var(--color-surface)"
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center mb-2 transition-all"
                          style={{
                            backgroundColor: isDone ? habit.color : "transparent",
                            border: `2px solid ${isDone ? habit.color : "var(--color-border)"}`,
                          }}
                        >
                          {isDone && <IconCheck className="w-3.5 h-3.5" style={{ color: "white" }} />}
                          {isToggling && !isDone && (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: habit.color }} />
                          )}
                        </div>

                        <p className="text-sm font-inter font-semibold text-ink leading-snug truncate">{habit.name}</p>

                        {streak > 0 && (
                          <p className="text-xs font-inter mt-1 flex items-center gap-1" style={{ color: "var(--color-ink-faint)" }}>
                            <IconFire className="w-3 h-3" style={{ color: habit.color }} />
                            <span className="font-sora font-bold" style={{ color: habit.color }}>{streak}</span>
                            <span>day{streak !== 1 ? "s" : ""}</span>
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── Section 2: Habit Cards ───────────────────────────────────── */}
            {habits.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xs font-inter font-semibold uppercase tracking-widest" style={{ color: "var(--color-ink-faint)" }}>
                    Your habits
                  </h2>
                  <span
                    className="text-[10px] font-inter font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}
                  >
                    {habits.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {habits.map(habit => {
                    const isExpanded = expandedId === habit.id
                    const isEditing = editingId === habit.id
                    const streak = getStreak(habit.logs)
                    const pct30 = get30DayPct(habit.logs)
                    const totalLogs = habit.logs.length
                    const last7 = getLast7Days()
                    const last30 = getLast30Days()
                    const logSet = new Set(habit.logs.map(l => l.date))
                    const isDeleting = deletingId === habit.id
                    const showDeleteConfirm = deleteConfirmId === habit.id

                    return (
                      <div
                        key={habit.id}
                        className="rounded-2xl overflow-hidden transition-all duration-200"
                        style={{
                          border: "1px solid var(--color-border)",
                          backgroundColor: "var(--color-surface)",
                          borderLeft: `3px solid ${habit.color}`,
                        }}
                      >
                        {/* ── Card Header (always visible) ─────────────────── */}
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          {/* Colored dot */}
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: habit.color }}
                          />

                          {/* Name + description */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-inter font-semibold text-ink leading-snug">{habit.name}</p>
                            {habit.description && !isExpanded && (
                              <p className="text-xs font-inter mt-0.5 truncate" style={{ color: "var(--color-ink-faint)" }}>
                                {habit.description}
                              </p>
                            )}
                          </div>

                          {/* Completion ring */}
                          {!isExpanded && <CompletionRing pct={pct30} color={habit.color} />}

                          {/* Expand chevron */}
                          <button
                            onClick={() => {
                              setExpandedId(isExpanded ? null : habit.id)
                              if (isExpanded) {
                                setEditingId(null)
                                setDeleteConfirmId(null)
                              }
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
                            style={{ color: "var(--color-ink-faint)", backgroundColor: "var(--color-surface-2)" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-ink)"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            <span
                              className="transition-transform duration-200"
                              style={{ display: "inline-flex", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                            >
                              <IconChevronDown className="w-4 h-4" />
                            </span>
                          </button>
                        </div>

                        {/* ── Expanded Body ─────────────────────────────────── */}
                        {isExpanded && (
                          <div
                            className="px-4 pb-4 space-y-5 border-t"
                            style={{ borderColor: "var(--color-border)" }}
                          >
                            {isEditing ? (
                              /* Edit form with auto-save */
                              <div className="space-y-4 pt-4">
                                <div>
                                  <label className="block text-xs font-inter font-medium mb-1.5" style={{ color: "var(--color-ink-muted)" }}>Name</label>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => {
                                      setEditName(e.target.value)
                                      scheduleEditAutoSave(habit.id, e.target.value, editDescription, editColor)
                                    }}
                                    maxLength={80}
                                    className="w-full h-10 px-3 rounded-xl text-sm font-inter outline-none"
                                    style={{
                                      backgroundColor: "var(--color-surface-2)",
                                      border: "1px solid var(--color-border)",
                                      color: "var(--color-ink)",
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
                                    onBlur={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-inter font-medium mb-1.5" style={{ color: "var(--color-ink-muted)" }}>Description</label>
                                  <textarea
                                    value={editDescription}
                                    onChange={(e) => {
                                      setEditDescription(e.target.value)
                                      scheduleEditAutoSave(habit.id, editName, e.target.value, editColor)
                                    }}
                                    rows={2}
                                    maxLength={200}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-inter outline-none resize-none"
                                    style={{
                                      backgroundColor: "var(--color-surface-2)",
                                      border: "1px solid var(--color-border)",
                                      color: "var(--color-ink)",
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
                                    onBlur={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-inter font-medium mb-2" style={{ color: "var(--color-ink-muted)" }}>Color</label>
                                  <div className="flex gap-2 flex-wrap">
                                    {COLOR_PALETTE.map(c => (
                                      <button
                                        key={c}
                                        type="button"
                                        onClick={() => {
                                          setEditColor(c)
                                          scheduleEditAutoSave(habit.id, editName, editDescription, c)
                                        }}
                                        className="w-6 h-6 rounded-full transition-transform"
                                        style={{
                                          backgroundColor: c,
                                          transform: editColor === c ? "scale(1.25)" : "scale(1)",
                                          outline: editColor === c ? `2px solid ${c}` : "none",
                                          outlineOffset: "2px",
                                        }}
                                        aria-label={`Select color ${c}`}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Done button + save status */}
                                <div className="flex items-center justify-between pt-2">
                                  <span
                                    className="text-xs font-inter"
                                    style={{
                                      color:
                                        editSaveStatus === "saved"
                                          ? "#22c55e"
                                          : editSaveStatus === "saving"
                                          ? "var(--color-ink-faint)"
                                          : editSaveStatus === "error"
                                          ? "#ef4444"
                                          : "transparent",
                                    }}
                                  >
                                    {editSaveStatus === "saving"
                                      ? "Saving…"
                                      : editSaveStatus === "saved"
                                      ? "✓ Saved"
                                      : editSaveStatus === "error"
                                      ? "Save failed"
                                      : "."}
                                  </span>
                                  <button
                                    onClick={() => { setEditingId(null); setEditSaveStatus("idle") }}
                                    className="h-9 px-4 rounded-xl text-sm font-inter font-semibold text-white"
                                    style={{ backgroundColor: "var(--color-accent)" }}
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Description */}
                                {habit.description && (
                                  <p className="text-sm font-inter pt-4" style={{ color: "var(--color-ink-muted)" }}>
                                    {habit.description}
                                  </p>
                                )}

                                {/* 7-day streak dots */}
                                <div className={habit.description ? "" : "pt-4"}>
                                  <p className="text-[10px] font-inter font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-ink-faint)" }}>
                                    Last 7 days
                                  </p>
                                  <div className="flex gap-2 items-end">
                                    {last7.map(d => {
                                      const isToday = d === today
                                      const done = logSet.has(d)
                                      const size = isToday ? 13 : 10
                                      return (
                                        <div key={d} className="flex flex-col items-center gap-1">
                                          <div
                                            className="rounded-full"
                                            style={{
                                              width: size,
                                              height: size,
                                              backgroundColor: done ? habit.color : "var(--color-border)",
                                              outline: isToday ? `1.5px solid ${habit.color}` : "none",
                                              outlineOffset: "2px",
                                            }}
                                          />
                                          <span className="text-[8px] font-inter" style={{ color: "var(--color-ink-faint)" }}>
                                            {["S","M","T","W","T","F","S"][(new Date(d + "T00:00:00").getDay())]}
                                          </span>
                                          {/* day number below for today */}
                                          {isToday && (
                                            <span className="text-[8px] font-inter font-bold" style={{ color: habit.color }}>
                                              {new Date(d + "T00:00:00").getDate()}
                                            </span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* 30-day grid */}
                                <div>
                                  <p className="text-[10px] font-inter font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-ink-faint)" }}>
                                    30-day overview
                                  </p>
                                  {/* 5 rows × 6 columns */}
                                  <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(6, 10px)" }}>
                                    {last30.map(d => {
                                      const done = logSet.has(d)
                                      const isToday = d === today
                                      return (
                                        <div
                                          key={d}
                                          title={d}
                                          style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 2,
                                            backgroundColor: done ? `${habit.color}cc` : "var(--color-surface-2)",
                                            outline: isToday ? `1.5px solid ${habit.color}` : "none",
                                            outlineOffset: "1px",
                                          }}
                                        />
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Stats row */}
                                <div className="flex gap-5">
                                  <div>
                                    <p className="text-base font-sora font-bold leading-none" style={{ color: habit.color }}>
                                      {streak}
                                    </p>
                                    <p className="text-[10px] font-inter mt-0.5 flex items-center gap-0.5" style={{ color: "var(--color-ink-faint)" }}>
                                      <IconFire className="w-3 h-3" />
                                      day streak
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-base font-sora font-bold leading-none" style={{ color: habit.color }}>
                                      {pct30}%
                                    </p>
                                    <p className="text-[10px] font-inter mt-0.5" style={{ color: "var(--color-ink-faint)" }}>
                                      this month
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-base font-sora font-bold leading-none" style={{ color: habit.color }}>
                                      {totalLogs}
                                    </p>
                                    <p className="text-[10px] font-inter mt-0.5" style={{ color: "var(--color-ink-faint)" }}>
                                      total check-ins
                                    </p>
                                  </div>
                                </div>

                                {/* Actions row */}
                                <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
                                  <button
                                    onClick={() => startEdit(habit)}
                                    className="flex items-center gap-1.5 text-xs font-inter transition-colors px-2 py-1 rounded-lg"
                                    style={{ color: "var(--color-ink-muted)" }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = "var(--color-ink)"
                                      e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = "var(--color-ink-muted)"
                                      e.currentTarget.style.backgroundColor = "transparent"
                                    }}
                                  >
                                    <IconPencil className="w-3.5 h-3.5" />
                                    Edit
                                  </button>

                                  {/* Delete section */}
                                  {showDeleteConfirm ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-inter" style={{ color: "var(--color-ink-muted)" }}>
                                        Are you sure?
                                      </span>
                                      <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="text-xs font-inter px-2 py-1 rounded-lg transition-colors"
                                        style={{ color: "var(--color-ink-muted)", backgroundColor: "var(--color-surface-2)" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-border)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleDelete(habit.id)}
                                        disabled={isDeleting}
                                        className="text-xs font-inter font-semibold px-2 py-1 rounded-lg text-white transition-opacity disabled:opacity-60"
                                        style={{ backgroundColor: "#ef4444" }}
                                      >
                                        {isDeleting ? "Deleting…" : "Delete"}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteConfirmId(habit.id)}
                                      className="text-xs font-inter px-2 py-1 rounded-lg transition-colors"
                                      style={{ color: "#ef4444" }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                      Delete habit
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── Section 3: AI Insights ───────────────────────────────────── */}
            <section>
              <div
                className="rounded-2xl p-6"
                style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <IconSparkles className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  <h2 className="text-sm font-sora font-semibold text-ink">AI Coaching Insights</h2>
                </div>

                {habits.length === 0 ? (
                  <p className="text-sm font-inter" style={{ color: "var(--color-ink-muted)" }}>
                    Add some habits first to get insights.
                  </p>
                ) : (
                  <>
                    {insights ? (
                      <>
                        <blockquote
                          className="text-sm font-inter leading-relaxed italic border-l-4 pl-4 my-4"
                          style={{
                            borderColor: "var(--color-accent)",
                            color: "var(--color-ink-muted)",
                          }}
                        >
                          {insights}
                        </blockquote>
                        <button
                          onClick={handleGetInsights}
                          disabled={insightsLoading}
                          className="flex items-center gap-2 text-sm font-inter font-medium transition-colors disabled:opacity-50"
                          style={{ color: "var(--color-accent)" }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.75"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        >
                          {insightsLoading ? (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <IconSparkles className="w-4 h-4" />
                          )}
                          {insightsLoading ? "Generating…" : "Re-generate insights"}
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-start gap-3">
                        <p className="text-sm font-inter" style={{ color: "var(--color-ink-muted)" }}>
                          Get personalized coaching based on your habit history.
                        </p>
                        <button
                          onClick={handleGetInsights}
                          disabled={insightsLoading}
                          className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-inter font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                          style={{ backgroundColor: "var(--color-accent)" }}
                        >
                          {insightsLoading ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Generating…
                            </>
                          ) : (
                            <>
                              <IconSparkles className="w-4 h-4" />
                              Get coaching insights
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {/* ── Progress tab ──────────────────────────────────────────────── */}
        {!loading && activeTab === "progress" && (
          <HabitsProgress habits={habits} />
        )}
      </main>

      {/* ── Add Habit Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          existingCount={habits.length}
        />
      )}
    </div>
  )
}
