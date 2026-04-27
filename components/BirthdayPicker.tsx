"use client"

/**
 * BirthdayPicker — three-step calendar: month → day → year (optional).
 *
 * Storage format
 *   "MM/DD"       — month + day only (legacy, still accepted on read)
 *   "MM/DD/YYYY"  — full date
 *   undefined     — nothing set
 *
 * Opening behaviour
 *   - Full date stored  → opens on year view  (easiest to change just the year)
 *   - Month+day stored  → opens on year view  (same: day is already chosen)
 *   - Month only stored → opens on day view
 *   - Nothing stored    → opens on month view
 *
 * The popover is portal-rendered into <body> via React.createPortal so it
 * is never clipped by overflow:hidden / overflow-y:auto ancestor containers.
 */

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"

const MONTH_FULL  = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

const CURRENT_YEAR = new Date().getFullYear()
/** Descending list of years from current year down to 1920. */
const YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => CURRENT_YEAR - i)

function daysInMonth(month: number) {
  // Use a non-leap year so February has 28 days.
  return new Date(2001, month, 0).getDate()
}

export interface BirthdayPickerProps {
  value?:   string                             // "MM/DD" | "MM/DD/YYYY" | undefined
  onChange: (value: string | undefined) => void
  variant?: "themed" | "dark"                  // default: "themed"
}

export function BirthdayPicker({
  value,
  onChange,
  variant = "themed",
}: BirthdayPickerProps) {
  // ── Parse stored value ────────────────────────────────────────────────────
  const parts     = value?.split("/") ?? []
  const savedMon  = parts.length >= 2 ? parseInt(parts[0], 10) : null  // 1–12
  const savedDay  = parts.length >= 2 ? parseInt(parts[1], 10) : null  // 1–31
  const savedYear = parts.length >= 3 ? parseInt(parts[2], 10) : null  // e.g. 1990

  // ── View state ────────────────────────────────────────────────────────────
  // null    = month grid
  // number  = day grid for that month
  const [viewMonth, setViewMonth] = useState<number | null>(null)
  // null    = day grid (or month grid)
  // number  = year grid (day already chosen)
  const [viewDay,   setViewDay]   = useState<number | null>(null)

  const [open,    setOpen]    = useState(false)
  const [pos,     setPos]     = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)

  const triggerRef  = useRef<HTMLButtonElement>(null)
  const yearGridRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // ── Design tokens ─────────────────────────────────────────────────────────
  const d = variant === "dark"

  const trigBg      = d ? "rgba(255,255,255,0.05)" : "var(--color-surface-2)"
  const trigBorder  = d ? "rgba(255,255,255,0.1)"  : "var(--color-border)"
  const trigColor   = value
    ? (d ? "#F0F0F0" : "var(--color-ink)")
    : (d ? "#8B8BA7" : "var(--color-ink-faint)")
  const popBg       = d ? "#1a1a2e"                : "var(--color-surface)"
  const popBorder   = d ? "rgba(255,255,255,0.12)" : "var(--color-border)"
  const labelClr    = d ? "#8B8BA7"                : "var(--color-ink-faint)"
  const cellSel     = d ? "#2563EB"                : "var(--color-accent)"
  const cellTextDef = d ? "#C0C0D0"                : "var(--color-ink-muted)"
  const headClr     = d ? "#F0F0F0"                : "var(--color-ink)"
  const backClr     = d ? "#8B8BA7"                : "var(--color-ink-faint)"
  const hoverBg     = d ? "rgba(255,255,255,0.08)" : "var(--color-surface-2)"
  const skipClr     = d ? "#6B7280"                : "var(--color-ink-faint)"

  // ── Display text ──────────────────────────────────────────────────────────
  const displayLabel = savedMon && savedDay
    ? savedYear
      ? `${MONTH_SHORT[savedMon - 1]} ${savedDay}, ${savedYear}`
      : `${MONTH_SHORT[savedMon - 1]} ${savedDay}`
    : null

  // ── Positioning ───────────────────────────────────────────────────────────
  function calcPos() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popW = 264
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popW - 8))
    setPos({ top: rect.bottom + 6, left })
  }

  // ── Open / close ─────────────────────────────────────────────────────────
  function handleOpen() {
    calcPos()
    if (savedMon && savedDay) {
      // Already has month+day → jump straight to year view
      setViewMonth(savedMon)
      setViewDay(savedDay)
    } else if (savedMon) {
      setViewMonth(savedMon)
      setViewDay(null)
    } else {
      setViewMonth(null)
      setViewDay(null)
    }
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
  }

  // ── Auto-scroll year grid to saved/current year ───────────────────────────
  useEffect(() => {
    if (!open || viewDay === null) return
    // Small delay so the grid has painted before we scroll
    const id = setTimeout(() => {
      const target = savedYear ?? CURRENT_YEAR
      const el = document.getElementById(`bdp-yr-${target}`)
      el?.scrollIntoView({ block: "center", behavior: "instant" })
    }, 30)
    return () => clearTimeout(id)
  }, [open, viewDay, savedYear])

  // ── Outside-click + Escape ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (document.getElementById("bdp-popover")?.contains(t)) return
      handleClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown",   onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown",   onKey)
    }
  }, [open])

  // ── Selection helpers ─────────────────────────────────────────────────────
  function selectDay(day: number) {
    setViewDay(day) // advance to year view
  }

  function confirmYear(year: number | null) {
    if (viewMonth === null || viewDay === null) return
    const mm = String(viewMonth).padStart(2, "0")
    const dd = String(viewDay).padStart(2, "0")
    onChange(year ? `${mm}/${dd}/${year}` : `${mm}/${dd}`)
    handleClose()
  }

  function clearValue(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(undefined)
    setViewMonth(null)
    setViewDay(null)
  }

  const numDays = viewMonth ? daysInMonth(viewMonth) : 0

  // ── Shared inner-button style helpers ────────────────────────────────────
  const cellBase: React.CSSProperties = {
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-inter, sans-serif)",
    transition: "background 0.1s, color 0.1s",
    borderRadius: "8px",
  }

  // ── Popover ───────────────────────────────────────────────────────────────
  const popover = open ? (
    <div
      id="bdp-popover"
      style={{
        position: "fixed",
        top:      pos.top,
        left:     pos.left,
        width:    264,
        zIndex:   9999,
        background:   popBg,
        border:       `1px solid ${popBorder}`,
        borderRadius: "12px",
        boxShadow:    "0 12px 40px rgba(0,0,0,0.4)",
        overflow:     "hidden",
      }}
    >

      {/* ── VIEW 1: Month grid ───────────────────────────────────────── */}
      {viewMonth === null && (
        <div style={{ padding: "12px" }}>
          <p style={{
            fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: labelClr,
            marginBottom: "10px", fontFamily: "var(--font-inter, sans-serif)",
          }}>
            Birthday month
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "4px" }}>
            {MONTH_SHORT.map((m, idx) => {
              const isSel = savedMon === idx + 1
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMonth(idx + 1)}
                  style={{
                    ...cellBase,
                    padding: "8px 0",
                    fontSize: "12px",
                    fontWeight: isSel ? 600 : 400,
                    background: isSel ? cellSel : hoverBg,
                    color: isSel ? "#fff" : cellTextDef,
                  }}
                  onMouseEnter={(e) => { if (!isSel) { e.currentTarget.style.background = d ? "rgba(255,255,255,0.14)" : "var(--color-surface)" } }}
                  onMouseLeave={(e) => { if (!isSel) { e.currentTarget.style.background = hoverBg } }}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: Day grid ─────────────────────────────────────────── */}
      {viewMonth !== null && viewDay === null && (
        <div style={{ padding: "12px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <button
              type="button"
              onClick={() => setViewMonth(null)}
              style={{
                ...cellBase,
                display: "flex", alignItems: "center", gap: "4px",
                background: "none",
                color: backClr, fontSize: "12px", padding: "2px 6px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.65" }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
              aria-label="Back to months"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 12L6 8l4-4"/>
              </svg>
              Back
            </button>
            <span style={{
              flex: 1, textAlign: "center",
              fontSize: "13px", fontWeight: 600, color: headClr,
              fontFamily: "var(--font-inter, sans-serif)",
            }}>
              {MONTH_FULL[viewMonth - 1]}
            </span>
            <span style={{ width: "46px" }} />
          </div>

          {/* 7-column day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>
            {Array.from({ length: numDays }, (_, i) => i + 1).map((day) => {
              const isSel = savedMon === viewMonth && savedDay === day
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    ...cellBase,
                    aspectRatio: "1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: isSel ? 600 : 400,
                    background: isSel ? cellSel : "transparent",
                    color: isSel ? "#fff" : cellTextDef,
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = hoverBg }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent" }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 3: Year grid ────────────────────────────────────────── */}
      {viewMonth !== null && viewDay !== null && (
        <div style={{ padding: "12px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
            <button
              type="button"
              onClick={() => setViewDay(null)}
              style={{
                ...cellBase,
                display: "flex", alignItems: "center", gap: "4px",
                background: "none",
                color: backClr, fontSize: "12px", padding: "2px 6px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.65" }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
              aria-label="Back to days"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 12L6 8l4-4"/>
              </svg>
              Back
            </button>
            <span style={{
              flex: 1, textAlign: "center",
              fontSize: "13px", fontWeight: 600, color: headClr,
              fontFamily: "var(--font-inter, sans-serif)",
            }}>
              {MONTH_SHORT[viewMonth - 1]} {viewDay}
            </span>
            {/* Skip year link */}
            <button
              type="button"
              onClick={() => confirmYear(null)}
              style={{
                ...cellBase,
                background: "none",
                fontSize: "11px", color: skipClr,
                padding: "2px 4px", borderRadius: "4px",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.65" }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
              title="Save without a year"
            >
              No year
            </button>
          </div>

          <p style={{
            fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: labelClr,
            marginBottom: "8px", fontFamily: "var(--font-inter, sans-serif)",
          }}>
            Birth year
          </p>

          {/* Scrollable year grid — 4 columns */}
          <div
            ref={yearGridRef}
            style={{ maxHeight: "192px", overflowY: "auto", overflowX: "hidden" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "3px" }}>
              {YEARS.map((year) => {
                const isSel = savedYear === year
                return (
                  <button
                    key={year}
                    id={`bdp-yr-${year}`}
                    type="button"
                    onClick={() => confirmYear(year)}
                    style={{
                      ...cellBase,
                      padding: "7px 0",
                      fontSize: "11px",
                      fontWeight: isSel ? 700 : 400,
                      background: isSel ? cellSel : "transparent",
                      color: isSel ? "#fff" : cellTextDef,
                    }}
                    onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = hoverBg }}
                    onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent" }}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  ) : null

  // ── Trigger button ────────────────────────────────────────────────────────
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? handleClose() : handleOpen())}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          borderRadius: "8px",
          border: `1px solid ${trigBorder}`,
          background: trigBg,
          color: trigColor,
          fontSize: "13px",
          fontFamily: "var(--font-inter, sans-serif)",
          cursor: "pointer",
          transition: "opacity 0.15s",
        }}
      >
        {/* Calendar icon */}
        <svg
          viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"
          width="13" height="13" style={{ flexShrink: 0 }}
        >
          <rect x="2" y="3" width="14" height="13" rx="2" strokeLinecap="round"/>
          <path strokeLinecap="round" d="M6 1.5v3M12 1.5v3M2 7.5h14"/>
        </svg>

        <span>{displayLabel ?? "Add birthday"}</span>

        {/* Clear — only shown when a date is set */}
        {displayLabel && (
          <span
            onClick={clearValue}
            role="button"
            tabIndex={-1}
            aria-label="Clear birthday"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "14px", height: "14px",
              cursor: "pointer", color: labelClr, marginLeft: "1px",
            }}
          >
            <svg viewBox="0 0 10 10" fill="currentColor" width="8" height="8">
              <path d="M5 4.293 8.646.646a.5.5 0 0 1 .708.708L5.707 5l3.647 3.646a.5.5 0 0 1-.708.708L5 5.707 1.354 9.354a.5.5 0 0 1-.708-.708L4.293 5 .646 1.354A.5.5 0 0 1 1.354.646L5 4.293Z"/>
            </svg>
          </span>
        )}
      </button>

      {/* Portal — prevents clipping by overflow:hidden ancestors */}
      {mounted && createPortal(popover, document.body)}
    </>
  )
}
