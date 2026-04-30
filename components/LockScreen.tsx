"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { createKeyBundle } from "@/lib/crypto"

interface LockScreenProps {
  onUnlock: (password: string) => void
}

// ── Icons ─────────────────────────────────────────────────────────────────
function IconEye() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
      width="18" height="18" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 10S5.5 4.5 10 4.5 17.5 10 17.5 10 14.5 15.5 10 15.5 2.5 10 2.5 10Z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  )
}
function IconEyeOff() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
      width="18" height="18" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l14 14M8.5 8.68A2.5 2.5 0 0 0 11.32 11.5M6.1 6.1C4.33 7.18 3 8.93 3 10c0 0 2.5 5.5 7 5.5a6.87 6.87 0 0 0 3.9-1.1M10 4.5c4.5 0 7 5.5 7 5.5a12.5 12.5 0 0 1-1.65 2.35" />
    </svg>
  )
}
function IconArrowLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
    </svg>
  )
}

// ── Step config ───────────────────────────────────────────────────────────
type Step = "unlock" | "warn" | "send" | "code" | "success"

const STEP_META: Record<Step, { title: string; backTo: Step | null }> = {
  unlock:  { title: "My Journal",      backTo: null     },
  warn:    { title: "Reset Password",  backTo: "unlock" },
  send:    { title: "Reset Password",  backTo: "warn"   },
  code:    { title: "Enter Code",      backTo: "send"   },
  success: { title: "Password Reset",  backTo: null     },
}

// ── Password input with show/hide toggle ─────────────────────────────────
function PasswordInput({
  value, onChange, placeholder = "", autoComplete = "current-password", disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full px-3 py-2.5 pr-10 rounded-xl border bg-surface text-ink text-sm font-inter focus:outline-none focus:ring-2 disabled:opacity-50"
        style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: "var(--color-ink-faint)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink-muted)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-faint)")}
      >
        {show ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { data: session } = useSession()

  const [step, setStep] = useState<Step>("unlock")

  // Unlock
  const [password,  setPassword]  = useState("")
  const [lockError, setLockError] = useState("")

  // Forgot — shared
  const [email, setEmail] = useState(session?.user?.email ?? "")

  // Forgot — send-code step
  const [sending,   setSending]   = useState(false)
  const [sendError, setSendError] = useState("")

  // Forgot — code + new password step
  const [code,       setCode]       = useState("")
  const [newPw,      setNewPw]      = useState("")
  const [confirmPw,  setConfirmPw]  = useState("")
  const [resetting,  setResetting]  = useState(false)
  const [resetError, setResetError] = useState("")

  // ── Navigation ────────────────────────────────────────────────────────
  const meta    = STEP_META[step]
  const backTo  = meta.backTo

  function goBack() {
    if (!backTo) return
    setStep(backTo)
    // Clear errors when navigating
    setLockError("")
    setSendError("")
    setResetError("")
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setLockError("")
    onUnlock(password)
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setSendError("Enter your email address."); return }
    setSendError("")
    setSending(true)
    try {
      const res  = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError(data.error ?? "Could not send code. Please try again.")
        return
      }
      setStep("code")
    } finally {
      setSending(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetError("")
    if (!code.trim())        { setResetError("Enter the 6-digit code from your email."); return }
    if (newPw.length < 8)    { setResetError("Password must be at least 8 characters."); return }
    if (newPw !== confirmPw) { setResetError("Passwords do not match."); return }

    setResetting(true)
    try {
      const { encryptedMek, mekIv, kekSalt } = await createKeyBundle(newPw)
      const res  = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, code: code.trim(), newPassword: newPw, encryptedMek, mekIv, kekSalt }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResetError(data.error ?? "Reset failed. Please try again.")
        return
      }
      setStep("success")
    } finally {
      setResetting(false)
    }
  }

  // ── Layout ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-page flex flex-col">

      {/* ── Sticky nav bar ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b shrink-0"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", backdropFilter: "blur(12px)" }}
      >
        <div className="grid items-center h-14 px-4 max-w-md mx-auto w-full" style={{ gridTemplateColumns: "1fr auto 1fr" }}>

          {/* Left — back button (hidden on unlock + success) */}
          <div className="flex items-center">
            {backTo !== null && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 h-9 px-2 rounded-lg text-sm font-inter transition-colors"
                style={{ color: "var(--color-ink-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-ink)"; e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-muted)"; e.currentTarget.style.backgroundColor = "transparent" }}
              >
                <IconArrowLeft />
                <span>Back</span>
              </button>
            )}
          </div>

          {/* Centre — title */}
          <h1 className="text-sm font-sora font-semibold text-ink text-center whitespace-nowrap">
            {meta.title}
          </h1>

          {/* Right — intentionally empty for balance */}
          <div />
        </div>
      </header>

      {/* ── Content — centred in the remaining viewport ───────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xs">

          {/* ── UNLOCK ──────────────────────────────────────────────────── */}
          {step === "unlock" && (
            <div>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="text-2xl font-sora font-semibold text-ink mb-2">
                  Your journal is locked
                </h2>
                <p className="text-sm font-inter text-ink-muted">
                  Enter your password to continue
                </p>
              </div>

              <form onSubmit={handleUnlock} className="space-y-3">
                <PasswordInput
                  value={password}
                  onChange={(v) => { setPassword(v); setLockError("") }}
                  placeholder="Password"
                  autoComplete="current-password"
                />
                {lockError && (
                  <p className="text-xs font-inter text-red-500 text-center">{lockError}</p>
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-sm font-inter font-semibold text-white transition-colors"
                  style={{ backgroundColor: "var(--color-accent)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
                >
                  Unlock
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setEmail(session?.user?.email ?? ""); setStep("warn") }}
                  className="text-xs font-inter transition-colors"
                  style={{ color: "var(--color-ink-faint)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-faint)")}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          {/* ── WARN ────────────────────────────────────────────────────── */}
          {step === "warn" && (
            <div>
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-sora font-semibold text-ink mb-2">
                  Before you reset…
                </h2>
                <p className="text-sm font-inter text-ink-muted">
                  Please read this carefully.
                </p>
              </div>

              <div
                className="rounded-2xl p-4 mb-6 text-sm font-inter leading-relaxed"
                style={{ backgroundColor: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)", color: "var(--color-ink-muted)" }}
              >
                Resetting your password will{" "}
                <strong style={{ color: "var(--color-ink)" }}>
                  permanently lock your existing journal entries.
                </strong>{" "}
                We cannot recover them — your entries are encrypted with a key only you hold.
                <br /><br />
                Entry titles and dates remain visible, but the content will be unreadable.
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setStep("send")}
                  className="w-full py-2.5 rounded-xl text-sm font-inter font-semibold text-white transition-colors"
                  style={{ backgroundColor: "#dc2626" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#b91c1c")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
                >
                  I understand — reset anyway
                </button>
                <button
                  onClick={goBack}
                  className="w-full py-2.5 rounded-xl text-sm font-inter font-medium transition-colors"
                  style={{ color: "var(--color-ink-muted)", backgroundColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── SEND CODE ───────────────────────────────────────────────── */}
          {step === "send" && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-sora font-semibold text-ink mb-2">
                  Send reset code
                </h2>
                <p className="text-sm font-inter text-ink-muted">
                  We&apos;ll email a 6-digit code to your address.
                </p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-3">
                <div>
                  <label className="block text-xs font-inter font-medium text-ink-muted mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setSendError("") }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full px-3 py-2.5 rounded-xl border bg-surface text-ink text-sm font-inter focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
                  />
                </div>

                {sendError && (
                  <p className="text-xs font-inter text-red-500">{sendError}</p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-2.5 rounded-xl text-sm font-inter font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-accent)" }}
                  onMouseEnter={(e) => { if (!sending) e.currentTarget.style.backgroundColor = "var(--color-accent-hover)" }}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
                >
                  {sending ? "Sending…" : "Send reset code"}
                </button>
              </form>
            </div>
          )}

          {/* ── ENTER CODE + NEW PASSWORD ────────────────────────────────── */}
          {step === "code" && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-sora font-semibold text-ink mb-2">
                  Enter your code
                </h2>
                <p className="text-sm font-inter text-ink-muted">
                  Check{" "}
                  <span className="font-medium" style={{ color: "var(--color-ink)" }}>
                    {email}
                  </span>{" "}
                  for a 6-digit code, then set your new password below.
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                {/* Code field */}
                <div>
                  <label className="block text-xs font-inter font-medium text-ink-muted mb-1.5">
                    Reset code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setResetError("") }}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    className="w-full px-3 py-2.5 rounded-xl border bg-surface text-ink text-sm font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
                  />
                </div>

                {/* Divider */}
                <div className="border-t" style={{ borderColor: "var(--color-border)" }} />

                {/* New password fields */}
                {[
                  { label: "New password",     value: newPw,     set: setNewPw     },
                  { label: "Confirm password",  value: confirmPw, set: setConfirmPw },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="block text-xs font-inter font-medium text-ink-muted mb-1.5">
                      {label}
                    </label>
                    <PasswordInput
                      value={value}
                      onChange={(v) => { set(v); setResetError("") }}
                      autoComplete="new-password"
                    />
                  </div>
                ))}

                {resetError && (
                  <p className="text-xs font-inter text-red-500">{resetError}</p>
                )}

                <button
                  type="submit"
                  disabled={resetting}
                  className="w-full py-2.5 rounded-xl text-sm font-inter font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-accent)" }}
                  onMouseEnter={(e) => { if (!resetting) e.currentTarget.style.backgroundColor = "var(--color-accent-hover)" }}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
                >
                  {resetting ? "Resetting…" : "Reset password"}
                </button>
              </form>

              <p className="text-xs font-inter text-center mt-5" style={{ color: "var(--color-ink-faint)" }}>
                Didn&apos;t receive a code?{" "}
                <button
                  type="button"
                  onClick={() => setStep("send")}
                  className="underline transition-colors"
                  style={{ color: "var(--color-ink-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-muted)")}
                >
                  Resend
                </button>
              </p>
            </div>
          )}

          {/* ── SUCCESS ─────────────────────────────────────────────────── */}
          {step === "success" && (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-sora font-semibold text-ink mb-2">
                Password reset!
              </h2>
              <p className="text-sm font-inter text-ink-muted mb-8">
                Your new password is active. Tap below to open your journal.
              </p>
              <button
                onClick={() => {
                  sessionStorage.setItem("masterPassword", newPw)
                  onUnlock(newPw)
                }}
                className="w-full py-2.5 rounded-xl text-sm font-inter font-semibold text-white transition-colors"
                style={{ backgroundColor: "var(--color-accent)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
              >
                Open journal
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
