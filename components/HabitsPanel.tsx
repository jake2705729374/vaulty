"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────
interface HabitLog { id: string; date: string }
interface Habit    { id: string; name: string; color: string; logs: HabitLog[] }

// ── Day-of-week column headers ─────────────────────────────────────────────
const DOW = ["S", "M", "T", "W", "T", "F", "S"]

// ── Helpers ───────────────────────────────────────────────────────────────
function isoForDay(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

// ── Component ─────────────────────────────────────────────────────────────
export default function HabitsPanel() {
  const now      = new Date()
  const todayIso = now.toISOString().slice(0, 10)

  const [habits,   setHabits]   = useState<Habit[]>([])
  const [loaded,   setLoaded]   = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  // Month navigation state (starts on current month)
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-indexed

  // Data only covers past 90 days — clamp navigation to that window
  const minDate  = new Date(now)
  minDate.setDate(minDate.getDate() - 89)
  const minYear  = minDate.getFullYear()
  const minMonth = minDate.getMonth()
  const canGoPrev = viewYear > minYear || (viewYear === minYear && viewMonth > minMonth)
  const canGoNext = viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth())

  // ── Data fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/habits")
      .then((r) => r.ok ? r.json() : { habits: [] })
      .then((data) => { setHabits(data.habits ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  // ── Toggle today's completion ─────────────────────────────────────────
  async function toggleHabit(habitId: string) {
    if (toggling.has(habitId)) return
    setToggling((prev) => new Set([...prev, habitId]))
    const habit    = habits.find((h) => h.id === habitId)
    if (!habit) { setToggling((prev) => { const n = new Set(prev); n.delete(habitId); return n }); return }
    const hadToday = habit.logs.some((l) => l.date === todayIso)
    // Optimistic update
    setHabits((prev) => prev.map((h) => h.id !== habitId ? h : {
      ...h,
      logs: hadToday
        ? h.logs.filter((l) => l.date !== todayIso)
        : [...h.logs, { id: "opt", date: todayIso }],
    }))
    try {
      await fetch(`/api/habits/${habitId}/logs`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ date: todayIso }),
      })
    } catch {
      // Revert on error
      setHabits((prev) => prev.map((h) => h.id !== habitId ? h : {
        ...h,
        logs: hadToday
          ? [...h.logs, { id: "opt", date: todayIso }]
          : h.logs.filter((l) => l.date !== todayIso),
      }))
    } finally {
      setToggling((prev) => { const n = new Set(prev); n.delete(habitId); return n })
    }
  }

  // ── Month navigation ──────────────────────────────────────────────────
  function prevMonth() {
    if (!canGoPrev) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (!canGoNext) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  // ── Calendar helpers ──────────────────────────────────────────────────
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthLabel      = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  // Map: "YYYY-MM-DD" → [color, color, ...]  for each completed habit that day
  const logMap = new Map<string, string[]>()
  habits.forEach((h) => {
    h.logs.forEach((l) => {
      const arr = logMap.get(l.date) ?? []
      arr.push(h.color)
      logMap.set(l.date, arr)
    })
  })

  // Monthly per-habit stats (days elapsed so far in the viewed month)
  function getMonthStats(habit: Habit) {
    const eligibleDays: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoForDay(viewYear, viewMonth, d)
      if (iso <= todayIso) eligibleDays.push(iso)
    }
    const done = eligibleDays.filter((iso) => habit.logs.some((l) => l.date === iso)).length
    const pct  = eligibleDays.length ? Math.round((done / eligibleDays.length) * 100) : 0
    return { done, total: eligibleDays.length, pct }
  }

  const doneToday = habits.filter((h) => h.logs.some((l) => l.date === todayIso)).length

  // ── Loading ───────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <span
          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (habits.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 px-5 text-center">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--color-surface-2)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20" style={{ color: "var(--color-ink-faint)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-sora font-semibold text-ink">No habits yet</p>
          <p className="text-xs font-inter text-ink-faint mt-1 leading-relaxed">Track your daily habits and see progress while you write.</p>
        </div>
        <Link
          href="/habits"
          className="text-xs font-inter font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          Add your first habit
        </Link>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ overscrollBehavior: "contain" }}>

      {/* ── Panel header ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <p className="text-[10px] font-inter font-semibold uppercase tracking-widest" style={{ color: "var(--color-ink-faint)" }}>
            Habits
          </p>
          <p className="text-xs font-inter font-medium mt-0.5" style={{ color: "var(--color-ink-muted)" }}>
            {doneToday === habits.length && habits.length > 0
              ? "All done today 🎉"
              : `${doneToday} / ${habits.length} done today`
            }
          </p>
        </div>
        <Link
          href="/habits"
          className="text-[11px] font-inter font-medium transition-colors flex items-center gap-0.5"
          style={{ color: "var(--color-ink-faint)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent)" }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-faint)" }}
        >
          View all →
        </Link>
      </div>

      {/* ── Today's check-in ──────────────────────────────────────────── */}
      <div
        className="px-4 pt-3 pb-4 flex-shrink-0 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <p className="text-[10px] font-inter font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-ink-faint)" }}>
          Today
        </p>
        <div className="flex flex-col gap-1.5">
          {habits.map((habit) => {
            const done       = habit.logs.some((l) => l.date === todayIso)
            const isToggling = toggling.has(habit.id)
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => void toggleHabit(habit.id)}
                disabled={isToggling}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-all focus:outline-none disabled:opacity-70"
                style={{
                  backgroundColor: done ? `${habit.color}14` : "transparent",
                  border: `1px solid ${done ? `${habit.color}50` : "var(--color-border)"}`,
                }}
                onMouseEnter={(e) => { if (!done) e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
                onMouseLeave={(e) => { if (!done) e.currentTarget.style.backgroundColor = "transparent" }}
              >
                {/* Checkbox */}
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: done ? habit.color : "transparent",
                    border: done ? "none" : `1.5px solid ${habit.color}`,
                  }}
                >
                  {isToggling ? (
                    <span
                      className="block w-2 h-2 rounded-full border border-t-transparent animate-spin"
                      style={{ borderColor: done ? "rgba(255,255,255,0.8)" : habit.color, borderTopColor: "transparent" }}
                    />
                  ) : done ? (
                    <svg viewBox="0 0 8 8" fill="none" width="6" height="6">
                      <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>

                {/* Name */}
                <span
                  className="flex-1 text-xs font-inter font-medium truncate transition-all"
                  style={{
                    color: done ? "var(--color-ink)" : "var(--color-ink-muted)",
                    textDecoration: done ? "line-through" : "none",
                    opacity: done ? 0.75 : 1,
                  }}
                >
                  {habit.name}
                </span>

                {/* Streak badge */}
                {(() => {
                  let streak = 0
                  const d = new Date(todayIso)
                  while (true) {
                    const iso = d.toISOString().slice(0, 10)
                    if (!habit.logs.some((l) => l.date === iso)) break
                    streak++
                    d.setDate(d.getDate() - 1)
                  }
                  return streak > 1 ? (
                    <span
                      className="flex-shrink-0 text-[10px] font-inter font-semibold px-1 rounded"
                      style={{ color: habit.color, backgroundColor: `${habit.color}18` }}
                    >
                      {streak}🔥
                    </span>
                  ) : null
                })()}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Monthly calendar ──────────────────────────────────────────── */}
      <div
        className="px-4 pt-3 pb-4 flex-shrink-0 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Month navigator */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors disabled:opacity-25 focus:outline-none"
            style={{ color: "var(--color-ink-faint)" }}
            onMouseEnter={(e) => { if (canGoPrev) e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>

          <span className="text-xs font-inter font-semibold text-ink">{monthLabel}</span>

          <button
            type="button"
            onClick={nextMonth}
            disabled={!canGoNext}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors disabled:opacity-25 focus:outline-none"
            style={{ color: "var(--color-ink-faint)" }}
            onMouseEnter={(e) => { if (canGoNext) e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DOW.map((d, i) => (
            <div
              key={i}
              className="flex items-center justify-center text-[9px] font-inter font-semibold"
              style={{ color: "var(--color-ink-faint)" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar day cells */}
        <div className="grid grid-cols-7">
          {/* Leading empty cells */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`e-${i}`} />)}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day      = i + 1
            const iso      = isoForDay(viewYear, viewMonth, day)
            const isToday  = iso === todayIso
            const isFuture = iso > todayIso
            const dots     = isFuture ? [] : (logMap.get(iso) ?? [])
            const allDone  = !isFuture && habits.length > 0 && dots.length === habits.length

            return (
              <div key={day} className="flex flex-col items-center py-0.5">
                {/* Number */}
                <div
                  className="w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-inter transition-all"
                  style={{
                    fontWeight:      isToday ? 700 : 500,
                    color:           isFuture ? "var(--color-border)"
                                   : isToday  ? "var(--color-accent)"
                                   : "var(--color-ink-muted)",
                    border:          isToday ? "1.5px solid var(--color-accent)" : "none",
                    backgroundColor: allDone ? `${habits[0].color}18` : "transparent",
                  }}
                >
                  {day}
                </div>

                {/* Completion dots — up to 3 habits, then +N */}
                <div className="flex gap-[2px] h-[5px] items-center mt-0.5">
                  {!isFuture && dots.length > 0 && (
                    <>
                      {dots.slice(0, 3).map((color, ci) => (
                        <span
                          key={ci}
                          className="block rounded-full flex-shrink-0"
                          style={{ width: 3, height: 3, backgroundColor: color }}
                        />
                      ))}
                      {dots.length > 3 && (
                        <span
                          className="block rounded-full flex-shrink-0"
                          style={{ width: 3, height: 3, backgroundColor: "var(--color-ink-faint)" }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Colour legend */}
        {habits.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {habits.map((h) => (
              <span key={h.id} className="flex items-center gap-1 text-[10px] font-inter" style={{ color: "var(--color-ink-faint)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} />
                {h.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Monthly breakdown ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-5 flex-shrink-0">
        <p
          className="text-[10px] font-inter font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-ink-faint)" }}
        >
          {new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long" })} breakdown
        </p>

        <div className="flex flex-col gap-3">
          {habits.map((habit) => {
            const { done, total, pct } = getMonthStats(habit)
            return (
              <div key={habit.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                    <span className="text-xs font-inter text-ink-muted truncate">{habit.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className="text-[11px] font-inter font-semibold" style={{ color: habit.color }}>{pct}%</span>
                    <span className="text-[10px] font-inter" style={{ color: "var(--color-ink-faint)" }}>{done}/{total}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: habit.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
