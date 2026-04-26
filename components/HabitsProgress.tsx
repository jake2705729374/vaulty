"use client"

import React from "react"

// ── Types ──────────────────────────────────────────────────────────────────
export interface HabitLog {
  id: string
  date: string // "YYYY-MM-DD"
}

export interface Habit {
  id: string
  name: string
  color: string
  logs: HabitLog[]
}

// ── Date helpers ───────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateStrFromOffset(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short" })
}

function getDayOfWeek(dateStr: string): number {
  // Returns 0=Sun … 6=Sat
  return new Date(dateStr + "T00:00:00").getDay()
}

/** Monday-based ISO week day: 0=Mon … 6=Sun */
function isoDow(dateStr: string): number {
  const dow = getDayOfWeek(dateStr) // 0=Sun
  return (dow + 6) % 7
}

// ── Streak helpers ─────────────────────────────────────────────────────────
function getCurrentStreak(logs: HabitLog[]): number {
  const logSet = new Set(logs.map(l => l.date))
  let streak = 0
  const today = todayStr()
  const d = new Date(today + "T00:00:00")
  while (true) {
    const ds = d.toISOString().slice(0, 10)
    if (!logSet.has(ds)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function getBestStreak(logs: HabitLog[]): number {
  if (logs.length === 0) return 0
  const sorted = [...logs.map(l => l.date)].sort()
  let best = 1
  let current = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00")
    const curr = new Date(sorted[i] + "T00:00:00")
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    if (diffDays === 1) {
      current++
      if (current > best) best = current
    } else if (diffDays > 1) {
      current = 1
    }
  }
  return best
}

// ── Card wrapper ───────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-inter font-semibold uppercase tracking-widest mb-4"
      style={{ color: "var(--color-ink-faint)" }}
    >
      {children}
    </p>
  )
}

// ── Chart 1: Completion Rate Over Last 30 Days ─────────────────────────────
function Chart1CompletionRate({ habits }: { habits: Habit[] }) {
  const totalHabits = habits.length
  const today = todayStr()

  // Build 30-day data
  const days = Array.from({ length: 30 }, (_, i) => {
    const ds = dateStrFromOffset(-(29 - i))
    const isToday = ds === today
    const completedCount = habits.filter(h => h.logs.some(l => l.date === ds)).length
    const pct = totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0
    return { ds, isToday, pct, completedCount }
  })

  const avgPct =
    totalHabits > 0
      ? Math.round(days.reduce((sum, d) => sum + d.pct, 0) / 30)
      : 0

  // SVG dimensions
  const W = 640
  const H = 220
  const padL = 36
  const padR = 12
  const padT = 28
  const padB = 40
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const barW = 14
  const gap = (chartW - 30 * barW) / 29

  return (
    <Card>
      <SectionLabel>Completion Rate — Last 30 Days</SectionLabel>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ minWidth: 320, display: "block" }}
      >
        {/* Y-axis grid lines & labels */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = padT + chartH - (pct / 100) * chartH
          return (
            <g key={pct}>
              <line
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={0.8}
                strokeDasharray="4 3"
              />
              <text
                x={padL - 4}
                y={y + 3}
                textAnchor="end"
                fontSize={8}
                fontFamily="var(--font-inter, sans-serif)"
                fill="var(--color-ink-faint)"
              >
                {pct}%
              </text>
            </g>
          )
        })}

        {/* Average label top-right */}
        <text
          x={W - padR}
          y={padT - 10}
          textAnchor="end"
          fontSize={10}
          fontFamily="var(--font-inter, sans-serif)"
          fill="var(--color-accent)"
          fontWeight="600"
        >
          Avg {avgPct}%
        </text>

        {/* Bars */}
        {days.map((day, i) => {
          const x = padL + i * (barW + gap)
          const barH = (day.pct / 100) * chartH
          const y = padT + chartH - barH

          let opacity = 0.25
          if (day.pct >= 100) opacity = 1.0
          else if (day.pct > 0) opacity = 0.65

          return (
            <g key={day.ds}>
              <rect
                x={x}
                y={day.pct === 0 ? padT + chartH - 2 : y}
                width={barW}
                height={day.pct === 0 ? 2 : barH}
                rx={2}
                fill="var(--color-accent)"
                opacity={opacity}
              />
            </g>
          )
        })}

        {/* X-axis labels every 5 days + today */}
        {days.map((day, i) => {
          const x = padL + i * (barW + gap) + barW / 2
          const showLabel = i % 5 === 0 || day.isToday
          if (!showLabel) return null
          const label = day.isToday ? "Today" : formatDateLabel(day.ds)
          return (
            <text
              key={day.ds}
              x={x}
              y={H - padB + 14}
              textAnchor="middle"
              fontSize={8}
              fontFamily="var(--font-inter, sans-serif)"
              fill={day.isToday ? "var(--color-accent)" : "var(--color-ink-faint)"}
              fontWeight={day.isToday ? "700" : "400"}
            >
              {label}
            </text>
          )
        })}
      </svg>
    </Card>
  )
}

// ── Chart 2: Weekly Comparison ─────────────────────────────────────────────
function Chart2WeeklyComparison({ habits }: { habits: Habit[] }) {
  const totalHabits = habits.length
  const today = todayStr()
  const todayDow = isoDow(today) // 0=Mon … 6=Sun

  // Build this week (Mon–Sun) and last week
  const thisWeekDays = Array.from({ length: 7 }, (_, i) => {
    return dateStrFromOffset(i - todayDow)
  })
  const lastWeekDays = thisWeekDays.map(ds => {
    const d = new Date(ds + "T00:00:00")
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  function pctForDay(ds: string, isFuture: boolean): number {
    if (isFuture) return 0
    if (totalHabits === 0) return 0
    const count = habits.filter(h => h.logs.some(l => l.date === ds)).length
    return (count / totalHabits) * 100
  }

  const thisWeekData = thisWeekDays.map((ds, i) => ({
    ds,
    isFuture: ds > today,
    pct: pctForDay(ds, ds > today),
    label: dayLabels[i],
  }))
  const lastWeekData = lastWeekDays.map((ds, i) => ({
    ds,
    isFuture: false,
    pct: pctForDay(ds, false),
    label: dayLabels[i],
  }))

  const thisAvg =
    totalHabits > 0
      ? Math.round(thisWeekData.filter(d => !d.isFuture).reduce((s, d) => s + d.pct, 0) /
          Math.max(1, thisWeekData.filter(d => !d.isFuture).length))
      : 0
  const lastAvg =
    totalHabits > 0
      ? Math.round(lastWeekData.reduce((s, d) => s + d.pct, 0) / 7)
      : 0

  const W = 540
  const H = 200
  const padL = 12
  const padR = 12
  const padT = 32
  const padB = 36
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const groupW = chartW / 7
  const barW = 14
  const barGap = 3
  const groupCenter = groupW / 2

  return (
    <Card>
      <SectionLabel>This Week vs Last Week</SectionLabel>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ minWidth: 280, display: "block" }}
      >
        {/* Y-axis grid lines */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = padT + chartH - (pct / 100) * chartH
          return (
            <line
              key={pct}
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth={0.8}
              strokeDasharray="4 3"
            />
          )
        })}

        {/* Averages top-right */}
        <text
          x={W - padR}
          y={padT - 16}
          textAnchor="end"
          fontSize={9}
          fontFamily="var(--font-inter, sans-serif)"
          fill="var(--color-accent)"
          fontWeight="600"
        >
          This: {thisAvg}% | Last: {lastAvg}%
        </text>

        {/* Legend */}
        <rect x={padL} y={padT - 18} width={8} height={8} rx={2} fill="var(--color-border)" />
        <text x={padL + 11} y={padT - 11} fontSize={9} fontFamily="var(--font-inter, sans-serif)" fill="var(--color-ink-faint)">Last week</text>
        <rect x={padL + 72} y={padT - 18} width={8} height={8} rx={2} fill="var(--color-accent)" />
        <text x={padL + 83} y={padT - 11} fontSize={9} fontFamily="var(--font-inter, sans-serif)" fill="var(--color-ink-faint)">This week</text>

        {/* Bars */}
        {Array.from({ length: 7 }, (_, i) => {
          const groupX = padL + i * groupW
          const cx = groupX + groupCenter
          const lastX = cx - barW - barGap / 2
          const thisX = cx + barGap / 2
          const lastPct = lastWeekData[i].pct
          const thisPct = thisWeekData[i].pct
          const isFuture = thisWeekData[i].isFuture

          const lastH = (lastPct / 100) * chartH
          const thisH = (thisPct / 100) * chartH

          return (
            <g key={i}>
              {/* Last week bar */}
              <rect
                x={lastX}
                y={padT + chartH - Math.max(lastH, 1)}
                width={barW}
                height={Math.max(lastH, 1)}
                rx={2}
                fill="var(--color-border)"
              />
              {/* This week bar */}
              <rect
                x={thisX}
                y={padT + chartH - Math.max(thisH, 1)}
                width={barW}
                height={Math.max(thisH, 1)}
                rx={2}
                fill="var(--color-accent)"
                opacity={isFuture ? 0.25 : 1}
              />
              {/* Day label */}
              <text
                x={cx}
                y={H - padB + 14}
                textAnchor="middle"
                fontSize={9}
                fontFamily="var(--font-inter, sans-serif)"
                fill="var(--color-ink-faint)"
              >
                {dayLabels[i]}
              </text>
            </g>
          )
        })}
      </svg>
    </Card>
  )
}

// ── Chart 3: Activity Heatmap ──────────────────────────────────────────────
function Chart3Heatmap({ habits }: { habits: Habit[] }) {
  const totalHabits = habits.length
  const today = todayStr()

  // 13 weeks = 91 days. We build a grid of 7 rows (Mon–Sun) × 13 cols.
  // The most recent column ends on Sunday ≥ today.
  const todayDow = isoDow(today) // 0=Mon … 6=Sun
  const daysToSunday = 6 - todayDow
  const gridEndDate = dateStrFromOffset(daysToSunday)
  const gridStartDate = (() => {
    const d = new Date(gridEndDate + "T00:00:00")
    d.setDate(d.getDate() - 13 * 7 + 1)
    return d.toISOString().slice(0, 10)
  })()

  // Build cell array: [col 0..12][row 0..6]
  interface Cell {
    ds: string
    pct: number
    count: number
    isFuture: boolean
    isToday: boolean
  }

  const cells: Cell[][] = Array.from({ length: 13 }, (_, col) =>
    Array.from({ length: 7 }, (_, row) => {
      const d = new Date(gridStartDate + "T00:00:00")
      d.setDate(d.getDate() + col * 7 + row)
      const ds = d.toISOString().slice(0, 10)
      const isFuture = ds > today
      const isToday = ds === today
      const count = habits.filter(h => h.logs.some(l => l.date === ds)).length
      const pct = totalHabits > 0 ? (count / totalHabits) * 100 : 0
      return { ds, pct, count, isFuture, isToday }
    })
  )

  function cellColor(cell: Cell): string {
    if (cell.isFuture) return "transparent"
    if (cell.pct === 0) return "var(--color-surface-2)"
    if (cell.pct <= 25) return "rgba(99,102,241,0.2)"
    if (cell.pct <= 50) return "rgba(99,102,241,0.45)"
    if (cell.pct <= 75) return "rgba(99,102,241,0.7)"
    return "rgba(99,102,241,0.95)"
  }

  const CELL = 13
  const GAP = 2
  const LABEL_LEFT = 28
  const LABEL_TOP = 20
  const LEGEND_BOTTOM = 24

  const gridW = 13 * (CELL + GAP) - GAP
  const gridH = 7 * (CELL + GAP) - GAP
  const W = LABEL_LEFT + gridW + 4
  const H = LABEL_TOP + gridH + LEGEND_BOTTOM + 10

  const rowLabels = ["Mon", "", "Wed", "", "Fri", "", "Sun"]

  // Month labels: place at first column where month changes
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = ""
  cells.forEach((col, ci) => {
    const firstCell = col[0]
    const month = formatMonthLabel(firstCell.ds)
    if (month !== lastMonth) {
      monthLabels.push({ col: ci, label: month })
      lastMonth = month
    }
  })

  const legendShades = [
    "var(--color-surface-2)",
    "rgba(99,102,241,0.2)",
    "rgba(99,102,241,0.45)",
    "rgba(99,102,241,0.7)",
    "rgba(99,102,241,0.95)",
  ]

  return (
    <Card>
      <SectionLabel>Activity Heatmap — Last 13 Weeks</SectionLabel>
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          style={{ display: "block", minWidth: W }}
        >
          {/* Month labels */}
          {monthLabels.map(({ col, label }) => (
            <text
              key={`month-${col}`}
              x={LABEL_LEFT + col * (CELL + GAP)}
              y={LABEL_TOP - 6}
              fontSize={8}
              fontFamily="var(--font-inter, sans-serif)"
              fill="var(--color-ink-faint)"
            >
              {label}
            </text>
          ))}

          {/* Row labels (Mon, Wed, Fri) */}
          {rowLabels.map((label, row) =>
            label ? (
              <text
                key={`row-${row}`}
                x={LABEL_LEFT - 4}
                y={LABEL_TOP + row * (CELL + GAP) + CELL / 2 + 3}
                textAnchor="end"
                fontSize={7}
                fontFamily="var(--font-inter, sans-serif)"
                fill="var(--color-ink-faint)"
              >
                {label}
              </text>
            ) : null
          )}

          {/* Cells */}
          {cells.map((col, ci) =>
            col.map((cell, ri) => {
              const x = LABEL_LEFT + ci * (CELL + GAP)
              const y = LABEL_TOP + ri * (CELL + GAP)
              const fill = cellColor(cell)
              return (
                <g key={`${ci}-${ri}`}>
                  <title>{`${formatDateLabel(cell.ds)}: ${cell.count} of ${totalHabits} habits (${Math.round(cell.pct)}%)`}</title>
                  <rect
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={fill}
                    stroke={
                      cell.isToday
                        ? "var(--color-accent)"
                        : cell.isFuture
                        ? "var(--color-border)"
                        : "none"
                    }
                    strokeWidth={cell.isToday ? 1.5 : 0.8}
                    opacity={cell.isFuture ? 0.3 : 1}
                  />
                </g>
              )
            })
          )}

          {/* Legend row */}
          {(() => {
            const legendY = LABEL_TOP + gridH + 14
            const startX = LABEL_LEFT
            return (
              <g>
                <text
                  x={startX}
                  y={legendY + CELL - 2}
                  fontSize={8}
                  fontFamily="var(--font-inter, sans-serif)"
                  fill="var(--color-ink-faint)"
                >
                  Less
                </text>
                {legendShades.map((shade, i) => (
                  <rect
                    key={i}
                    x={startX + 28 + i * (CELL + 2)}
                    y={legendY}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={shade}
                    stroke="var(--color-border)"
                    strokeWidth={0.5}
                  />
                ))}
                <text
                  x={startX + 28 + 5 * (CELL + 2) + 2}
                  y={legendY + CELL - 2}
                  fontSize={8}
                  fontFamily="var(--font-inter, sans-serif)"
                  fill="var(--color-ink-faint)"
                >
                  More
                </text>
              </g>
            )
          })()}
        </svg>
      </div>
    </Card>
  )
}

// ── Chart 4: Streak History ────────────────────────────────────────────────
function Chart4StreakHistory({ habits }: { habits: Habit[] }) {
  const data = habits.map(h => ({
    name: h.name.length > 14 ? h.name.slice(0, 14) + "…" : h.name,
    color: h.color,
    current: getCurrentStreak(h.logs),
    best: getBestStreak(h.logs),
  }))

  const maxStreak = Math.max(...data.map(d => d.best), 1)
  const BAR_H = 12
  const ROW_SPACING = 36
  const LABEL_W = 90
  const RIGHT_LABEL_W = 28
  const PAD_T = 16
  const PAD_B = 8
  const W = 560
  const chartW = W - LABEL_W - RIGHT_LABEL_W - 8
  const H = PAD_T + data.length * ROW_SPACING + PAD_B

  return (
    <Card>
      <SectionLabel>Streak History</SectionLabel>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ minWidth: 280, display: "block" }}
      >
        {data.map((d, i) => {
          const y = PAD_T + i * ROW_SPACING
          const barY = y + (ROW_SPACING - BAR_H) / 2 - 4
          const bestW = maxStreak > 0 ? (d.best / maxStreak) * chartW : 0
          const curW = maxStreak > 0 ? (d.current / maxStreak) * chartW : 0

          return (
            <g key={d.name + i}>
              {/* Habit name label */}
              <text
                x={LABEL_W - 6}
                y={barY + BAR_H / 2 + 4}
                textAnchor="end"
                fontSize={10}
                fontFamily="var(--font-inter, sans-serif)"
                fill="var(--color-ink-muted)"
              >
                {d.name}
              </text>

              {/* Best streak bar (background) */}
              <rect
                x={LABEL_W}
                y={barY}
                width={Math.max(bestW, 2)}
                height={BAR_H}
                rx={3}
                fill="var(--color-border)"
              />

              {/* Current streak bar (foreground) */}
              {d.current > 0 && (
                <rect
                  x={LABEL_W}
                  y={barY}
                  width={Math.max(curW, 2)}
                  height={BAR_H}
                  rx={3}
                  fill={d.color}
                />
              )}

              {/* Current streak label inside bar */}
              {d.current > 0 && curW > 18 && (
                <text
                  x={LABEL_W + curW / 2}
                  y={barY + BAR_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="var(--font-inter, sans-serif)"
                  fill="white"
                  fontWeight="700"
                >
                  {d.current}
                </text>
              )}

              {/* Best streak label to right */}
              <text
                x={LABEL_W + Math.max(bestW, 2) + 5}
                y={barY + BAR_H / 2 + 4}
                fontSize={9}
                fontFamily="var(--font-inter, sans-serif)"
                fill="var(--color-ink-faint)"
              >
                {d.best}d
              </text>
            </g>
          )
        })}
      </svg>
    </Card>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <p className="text-sm font-sora font-semibold" style={{ color: "var(--color-ink)" }}>
        No data yet
      </p>
      <p className="text-sm font-inter max-w-xs" style={{ color: "var(--color-ink-faint)" }}>
        Add habits and start checking them off to see your progress here.
      </p>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
export default function HabitsProgress({ habits }: { habits: Habit[] }) {
  if (habits.length === 0) return <EmptyState />

  return (
    <div className="space-y-10">
      <Chart1CompletionRate habits={habits} />
      <Chart2WeeklyComparison habits={habits} />
      <Chart3Heatmap habits={habits} />
      <Chart4StreakHistory habits={habits} />
    </div>
  )
}
