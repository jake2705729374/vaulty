"use client"

import { getPasswordStrength } from "@/lib/password-strength"

interface Props {
  password: string
  /**
   * "dark"  — for dark backgrounds (register page, #0A0A0F).
   * "light" — for themed surfaces (settings page, uses CSS variables).
   */
  variant?: "dark" | "light"
}

/**
 * Reusable password strength meter.
 *
 * Shows:
 *   • 4-segment coloured bar (one per requirement)
 *   • Strength label (Too weak / Weak / Good / Strong / Too common)
 *   • Checklist of the 4 requirements with animated tick marks
 *
 * Renders nothing when password is empty.
 */
export default function PasswordStrengthMeter({ password, variant = "light" }: Props) {
  if (!password) return null

  const strength  = getPasswordStrength(password)
  const isDark    = variant === "dark"

  const emptyBar  = isDark ? "rgba(255,255,255,0.1)"  : "var(--color-border)"
  const dimText   = isDark ? "rgba(255,255,255,0.3)"   : "var(--color-ink-faint)"
  const metText   = isDark ? "#f0f0f0"                 : "var(--color-ink-muted)"

  return (
    <div className="mt-2 space-y-2.5">

      {/* ── Segmented bar ──────────────────────────────────────────── */}
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: i < strength.score ? strength.color : emptyBar,
            }}
          />
        ))}
      </div>

      {/* ── Label ─────────────────────────────────────────────────── */}
      <p
        className="text-xs font-inter font-semibold"
        style={{ color: strength.color }}
      >
        {strength.label}
        {strength.isCommon && (
          <span className="font-normal ml-1" style={{ color: dimText }}>
            — try adding numbers or symbols
          </span>
        )}
      </p>

      {/* ── Requirements checklist ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {strength.requirements.map((req) => (
          <div key={req.id} className="flex items-center gap-1.5">
            {/* Tick / circle */}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
              {req.met ? (
                <>
                  <circle cx="6" cy="6" r="6" fill="#22C55E" />
                  <path
                    d="M3.5 6l1.8 1.8L8.5 4"
                    stroke="#fff"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                <circle
                  cx="6" cy="6" r="5.25"
                  stroke={dimText}
                  strokeWidth="1.5"
                />
              )}
            </svg>
            <span
              className="text-xs font-inter leading-none"
              style={{ color: req.met ? metText : dimText }}
            >
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
