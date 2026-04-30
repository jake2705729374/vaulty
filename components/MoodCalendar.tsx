"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

const MOOD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  GREAT: { label: "Great", color: "#22c55e", bg: "rgba(34,197,94,0.15)"  },
  GOOD:  { label: "Good",  color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  OKAY:  { label: "Okay",  color: "#eab308", bg: "rgba(234,179,8,0.15)"  },
  LOW:   { label: "Low",   color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  AWFUL: { label: "Awful", color: "#ef4444", bg: "rgba(239,68,68,0.15)"  },
}

interface DayData { date: string; mood: string; entryId: string }

interface MoodCalendarProps {
  initialYear?:  number
  initialMonth?: number
}

export default function MoodCalendar({ initialYear, initialMonth }: MoodCalendarProps) {
  const today = new Date()
  const [year,    setYear]    = useState(initialYear  ?? today.getFullYear())
  const [month,   setMonth]   = useState(initialMonth ?? today.getMonth() + 1)
  const [days,    setDays]    = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset loading when month/year changes
    setLoading(true)
    // Send the client's UTC offset so the API can bucket entries into local dates.
    // getTimezoneOffset() returns (UTC − local) in minutes; negate it to get the
    // standard offset (e.g. −420 for UTC-7, +540 for UTC+9).
    const offset = -new Date().getTimezoneOffset()
    fetch(`/api/mood/calendar?year=${year}&month=${month}&offset=${offset}`)
      .then((r) => r.json())
      .then((data) => { setDays(data.days ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
    if (isCurrentMonth) return
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  // Build calendar grid
  const firstDay    = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthName   = new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const dayMap: Record<string, DayData> = {}
  for (const d of days) dayMap[d.date] = d

  // Grid cells: leading blanks + days
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  // Use local date components so "today" matches what the user sees on their
  // calendar, regardless of timezone.
  const todayYear  = today.getFullYear()
  const todayMonth = today.getMonth() + 1   // 1-indexed
  const todayDay   = today.getDate()

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-sm"
          style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-border)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--color-surface-2)"}
        >‹</button>
        <p className="text-sm font-sora font-semibold text-ink">{monthName}</p>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-sm disabled:opacity-30"
          style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)" }}
          onMouseEnter={(e) => { if (!isCurrentMonth) e.currentTarget.style.background = "var(--color-border)" }}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--color-surface-2)"}
        >›</button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 px-3 pt-3 pb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-inter font-semibold uppercase tracking-wider pb-2" style={{ color: "var(--color-ink-faint)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span
            className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 px-3 pb-4">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />

            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const data    = dayMap[dateStr]
            const cfg     = data ? MOOD_CONFIG[data.mood] : null

            // Compare against LOCAL date components — no UTC-shift issues
            const isToday  = year === todayYear && month === todayMonth && day === todayDay
            const isFuture = year > todayYear
              || (year === todayYear && month > todayMonth)
              || (year === todayYear && month === todayMonth && day > todayDay)

            const cell = (
              <div
                className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-inter transition-all relative overflow-hidden"
                style={{
                  background: cfg
                    ? cfg.bg
                    : isToday
                      ? "var(--color-surface-2)"
                      : "transparent",
                  border: `1px solid ${
                    cfg
                      ? cfg.color + "40"
                      : isToday
                        ? "1px dashed var(--color-border)"
                        : "transparent"
                  }`,
                  color:      isFuture ? "var(--color-ink-faint)" : "var(--color-ink)",
                  opacity:    isFuture ? 0.35 : 1,
                  cursor:     data ? "pointer" : "default",
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {/* X for today with no mood logged */}
                {isToday && !cfg && (
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 40 40"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <line x1="9" y1="9" x2="31" y2="31" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="31" y1="9" x2="9"  y2="31" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
                <span className="relative z-10">{day}</span>
                {cfg && <span className="w-1.5 h-1.5 rounded-full relative z-10" style={{ background: cfg.color }} />}
              </div>
            )

            return data ? (
              <Link key={i} href={`/journal/${data.entryId}`} title={cfg?.label} className="block hover:scale-105 transition-transform">
                {cell}
              </Link>
            ) : (
              <div key={i}>{cell}</div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        {Object.entries(MOOD_CONFIG).map(([, cfg]) => (
          <span key={cfg.label} className="flex items-center gap-1.5 text-[10px] font-inter" style={{ color: "var(--color-ink-faint)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        ))}
      </div>
    </div>
  )
}
