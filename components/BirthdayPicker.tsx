"use client"

/**
 * BirthdayPicker — month/day calendar widget (no year, since birthdays recur).
 *
 * Renders its popover via a React portal attached to <body> so it is never
 * clipped by ancestor overflow:hidden / overflow-y:auto containers (which
 * both the settings expandable cards and the onboarding scrollable list use).
 *
 * Props:
 *   value   — "MM/DD" string or undefined
 *   onChange — called with a new "MM/DD" string, or undefined when cleared
 *   variant — "themed" uses CSS variables (settings page); "dark" uses the
 *             hardcoded dark palette (onboarding page)
 */

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"

const MONTH_FULL  = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

/** Days in each month — uses a non-leap year (2001) so February = 28. */
function daysInMonth(month: number) {
  return new Date(2001, month, 0).getDate()
}

export interface BirthdayPickerProps {
  value?:   string                            // "MM/DD" or undefined
  onChange: (value: string | undefined) => void
  variant?: "themed" | "dark"                 // default: "themed"
}

export function BirthdayPicker({
  value,
  onChange,
  variant = "themed",
}: BirthdayPickerProps) {
  // ── Parse stored value ────────────────────────────────────────────────────
  const parts    = value?.split("/") ?? []
  const savedMon = parts.length === 2 ? parseInt(parts[0], 10) : null  // 1–12
  const savedDay = parts.length === 2 ? parseInt(parts[1], 10) : null

  // ── State ──────────────────────────────────────────────────────────────────
  const [open,      setOpen]      = useState(false)
  const [viewMonth, setViewMonth] = useState<number | null>(null) // null = month grid
  const [pos,       setPos]       = useState({ top: 0, left: 0 })
  const [mounted,   setMounted]   = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)

  // Portal requires the DOM to exist
  useEffect(() => { setMounted(true) }, [])

  // ── Design tokens ──────────────────────────────────────────────────────────
  const d = variant === "dark"

  const trigBg      = d ? "rgba(255,255,255,0.05)" : "var(--color-surface-2)"
  const trigBorder  = d ? "rgba(255,255,255,0.1)"  : "var(--color-border)"
  const trigColor   = value
    ? (d ? "#F0F0F0"  : "var(--color-ink)")
    : (d ? "#8B8BA7"  : "var(--color-ink-faint)")
  const popBg       = d ? "#1a1a2e"                : "var(--color-surface)"
  const popBorder   = d ? "rgba(255,255,255,0.12)" : "var(--color-border)"
  const labelClr    = d ? "#8B8BA7"                : "var(--color-ink-faint)"
  const cellSel     = d ? "#2563EB"                : "var(--color-accent)"
  const cellTextDef = d ? "#C0C0D0"                : "var(--color-ink-muted)"
  const headClr     = d ? "#F0F0F0"                : "var(--color-ink)"
  const backClr     = d ? "#8B8BA7"                : "var(--color-ink-faint)"
  const hoverBg     = d ? "rgba(255,255,255,0.08)" : "var(--color-surface-2)"

  // ── Display text ───────────────────────────────────────────────────────────
  const displayLabel = savedMon && savedDay
    ? `${MONTH_SHORT[savedMon - 1]} ${savedDay}`
    : null

  // ── Popover positioning ────────────────────────────────────────────────────
  function calcPos() {
    if (!triggerRef.current) return
    const rect  = triggerRef.current.getBoundingClientRect()
    const popW  = 256
    const left  = Math.max(8, Math.min(rect.left, window.innerWidth - popW - 8))
    const top   = rect.bottom + 6
    setPos({ top, left })
  }

  // ── Open / close ──────────────────────────────────────────────────────────
  function handleOpen() {
    calcPos()
    setViewMonth(savedMon)   // jump straight to day grid if a month is saved
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
  }

  // ── Outside-click + Escape ─────────────────────────────────────────────────
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

  // ── Day selection ─────────────────────────────────────────────────────────
  function selectDay(day: number) {
    if (!viewMonth) return
    onChange(`${String(viewMonth).padStart(2, "0")}/${String(day).padStart(2, "0")}`)
    handleClose()
  }

  function clearValue(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(undefined)
    setViewMonth(null)
  }

  const numDays = viewMonth ? daysInMonth(viewMonth) : 0

  // ── Popover markup (rendered into portal) ─────────────────────────────────
  const popover = open ? (
    <div
      id="bdp-popover"
      style={{
        position: "fixed",
        top:      pos.top,
        left:     pos.left,
        width:    256,
        zIndex:   9999,
        background:  popBg,
        border:      `1px solid ${popBorder}`,
        borderRadius: "12px",
        boxShadow:   "0 12px 40px rgba(0,0,0,0.4)",
        overflow:    "hidden",
      }}
    >
      {viewMonth === null ? (
        /* ── Month grid ─────────────────────────────── */
        <div style={{ padding: "12px" }}>
          <p
            style={{
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em",
              textTransform: "uppercase", color: labelClr,
              marginBottom: "10px", fontFamily: "var(--font-inter, sans-serif)",
            }}
          >
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
                    padding: "8px 0",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: isSel ? 600 : 400,
                    background: isSel ? cellSel : hoverBg,
                    color: isSel ? "#ffffff" : cellTextDef,
                    fontFamily: "var(--font-inter, sans-serif)",
                    transition: "background 0.1s, color 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = hoverBg; e.currentTarget.style.opacity = "0.85" }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; if (!isSel) e.currentTarget.style.background = hoverBg }}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── Day grid ────────────────────────────────── */
        <div style={{ padding: "12px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <button
              type="button"
              onClick={() => setViewMonth(null)}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                border: "none", background: "none", cursor: "pointer",
                color: backClr, fontSize: "12px", padding: "2px 4px",
                borderRadius: "6px", fontFamily: "var(--font-inter, sans-serif)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7" }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
              aria-label="Back to month selection"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 12L6 8l4-4"/>
              </svg>
              Back
            </button>
            <span
              style={{
                flex: 1, textAlign: "center",
                fontSize: "13px", fontWeight: 600, color: headClr,
                fontFamily: "var(--font-inter, sans-serif)",
              }}
            >
              {MONTH_FULL[viewMonth - 1]}
            </span>
            {/* spacer to balance the back button */}
            <span style={{ width: "42px" }} />
          </div>

          {/* Day grid — 7 columns */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>
            {Array.from({ length: numDays }, (_, i) => i + 1).map((day) => {
              const isSel = savedMon === viewMonth && savedDay === day
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    aspectRatio: "1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: isSel ? 600 : 400,
                    background: isSel ? cellSel : "transparent",
                    color: isSel ? "#ffffff" : cellTextDef,
                    fontFamily: "var(--font-inter, sans-serif)",
                    transition: "background 0.1s",
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
    </div>
  ) : null

  // ── Render ─────────────────────────────────────────────────────────────────
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

        {/* Clear button — only shown when a date is set */}
        {displayLabel && (
          <span
            onClick={clearValue}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "14px", height: "14px", borderRadius: "50%",
              cursor: "pointer", color: labelClr, marginLeft: "1px",
            }}
            role="button"
            tabIndex={-1}
            aria-label="Clear birthday"
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
