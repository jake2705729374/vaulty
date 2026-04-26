"use client"

import { useState, useMemo, useEffect, useRef, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import AuthNav from "@/components/AuthNav"

// ── Password strength ────────────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)           score++
  if (pw.length >= 12)          score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: "Weak",        color: "#EF4444" }
  if (score <= 3) return { score, label: "Fair",        color: "#F59E0B" }
  if (score === 4) return { score, label: "Strong",     color: "#22C55E" }
  return                { score, label: "Very strong",  color: "#10B981" }
}

const RESEND_COOLDOWN = 60 // seconds

function RegisterForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // ── Step 1 state ────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [showPw,   setShowPw]   = useState(false)

  // ── Step 2 state ────────────────────────────────────────────────────────
  const [step,        setStep]        = useState<"form" | "verify">("form")
  const [codeInputs,  setCodeInputs]  = useState(["", "", "", "", "", ""])
  const [verifyError, setVerifyError] = useState("")
  const [verifying,   setVerifying]   = useState(false)
  const [cooldown,    setCooldown]    = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Shared state ────────────────────────────────────────────────────────
  const [error,     setError]     = useState("")
  const [loading,   setLoading]   = useState(false)
  // True when arriving from the login page (?verify=1) — no password in state
  const [fromLogin, setFromLogin] = useState(false)

  const strength       = useMemo(() => getStrength(password), [password])
  const passwordsMatch = confirm.length > 0 && password === confirm

  // Refs for OTP boxes
  const boxRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Cooldown timer ───────────────────────────────────────────────────────
  function startCooldown() {
    setCooldown(RESEND_COOLDOWN)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }, [])

  // ── Deep-link from login page (?email=...&verify=1) ──────────────────────
  // When a user tries to log in before verifying their email, the login page
  // resends the code and redirects here with their email pre-filled.
  useEffect(() => {
    const emailParam  = searchParams.get("email")
    const verifyParam = searchParams.get("verify")
    if (verifyParam === "1" && emailParam) {
      setEmail(emailParam)
      setFromLogin(true)
      setStep("verify")
      // Code was already resent by the login page; start the cooldown timer
      startCooldown()
      setTimeout(() => boxRefs.current[0]?.focus(), 200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Step 1: submit registration form ────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirm) { setError("Passwords do not match."); return }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return }

    setLoading(true)
    const res = await fetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError((data as { error?: string }).error ?? "Registration failed.")
      return
    }

    // Account created — move to verification step
    setStep("verify")
    startCooldown()
    setTimeout(() => boxRefs.current[0]?.focus(), 100)
  }

  // ── Step 2: OTP box input handling ──────────────────────────────────────
  function handleBoxChange(idx: number, val: string) {
    // Handle paste of full code
    if (val.length > 1) {
      const digits = val.replace(/\D/g, "").slice(0, 6).split("")
      const next = ["", "", "", "", "", ""]
      digits.forEach((d, i) => { next[i] = d })
      setCodeInputs(next)
      const focusIdx = Math.min(digits.length, 5)
      boxRefs.current[focusIdx]?.focus()
      return
    }
    const digit = val.replace(/\D/g, "")
    const next = [...codeInputs]
    next[idx] = digit
    setCodeInputs(next)
    if (digit && idx < 5) boxRefs.current[idx + 1]?.focus()
  }

  function handleBoxKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !codeInputs[idx] && idx > 0) {
      boxRefs.current[idx - 1]?.focus()
    }
    if (e.key === "ArrowLeft"  && idx > 0) boxRefs.current[idx - 1]?.focus()
    if (e.key === "ArrowRight" && idx < 5) boxRefs.current[idx + 1]?.focus()
  }

  // ── Step 2: verify the code ──────────────────────────────────────────────
  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault()
    setVerifyError("")
    const code = codeInputs.join("")
    if (code.length < 6) { setVerifyError("Enter all 6 digits."); return }

    setVerifying(true)
    const res = await fetch("/api/auth/verify-email", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, code }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setVerifyError((data as { error?: string }).error ?? "Verification failed.")
      setVerifying(false)
      // Clear inputs and refocus first box on wrong code
      setCodeInputs(["", "", "", "", "", ""])
      setTimeout(() => boxRefs.current[0]?.focus(), 50)
      return
    }

    setVerifying(false)

    // When arriving from the login page, no password is stored here — just
    // redirect back to login so they can sign in normally.
    if (fromLogin || !password) {
      router.push("/login?verified=1")
      return
    }

    // Verified via normal registration flow — auto sign in and go to onboarding
    const result = await signIn("credentials", { email, password, redirect: false })

    if (result?.error) {
      setVerifyError("Email verified! Please sign in to continue.")
      router.push("/login")
    } else {
      sessionStorage.setItem("masterPassword", password)
      // Flag the dashboard to show the welcome splash after onboarding completes
      sessionStorage.setItem("showWelcomeSplash", "1")
      router.push("/onboarding")
    }
  }

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (step === "verify" && codeInputs.every((d) => d !== "")) {
      handleVerify()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeInputs])

  // ── Resend code ──────────────────────────────────────────────────────────
  async function handleResend() {
    if (cooldown > 0) return
    setVerifyError("")

    const res = await fetch("/api/auth/resend-verification", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setVerifyError((data as { error?: string }).error ?? "Could not resend code.")
      return
    }

    startCooldown()
    setCodeInputs(["", "", "", "", "", ""])
    setTimeout(() => boxRefs.current[0]?.focus(), 50)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
    <AuthNav page="register" />
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 pt-24 relative overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      {/* Background orb */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm flex flex-col gap-8"
      >

        {/* Card */}
        <div
          className="w-full rounded-2xl p-8 flex flex-col gap-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
          }}
        >
          <AnimatePresence mode="wait">

            {/* ── Step 1: Registration form ─────────────────────── */}
            {step === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-1">
                  <h1
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
                  >
                    Create your vault
                  </h1>
                  <p className="text-sm" style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}>
                    Private. Encrypted. Yours alone.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0F0", fontFamily: "var(--font-inter)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                  </div>

                  {/* Password + strength */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}>
                      Master password
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className="w-full px-3.5 py-2.5 pr-16 rounded-xl text-sm outline-none transition-all duration-200"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0F0", fontFamily: "var(--font-inter)" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                        onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium transition-colors duration-150"
                        style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0F0")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#8B8BA7")}
                        tabIndex={-1}
                      >
                        {showPw ? "Hide" : "Show"}
                      </button>
                    </div>
                    {password.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1.5">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i < strength.score ? strength.color : "rgba(255,255,255,0.1)" }}
                            />
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: strength.color, fontFamily: "var(--font-inter)" }}>
                          {strength.label}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Confirm */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}>
                      Confirm password
                    </label>
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${confirm.length === 0 ? "rgba(255,255,255,0.1)" : passwordsMatch ? "#22C55E" : "#EF4444"}`,
                        color: "#F0F0F0",
                        fontFamily: "var(--font-inter)",
                      }}
                      onFocus={(e) => { if (!confirm.length) e.currentTarget.style.borderColor = "#2563EB" }}
                      onBlur={(e)  => { if (!confirm.length) e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)" }}
                    />
                    {confirm.length > 0 && (
                      <span className="text-xs" style={{ color: passwordsMatch ? "#22C55E" : "#EF4444", fontFamily: "var(--font-inter)" }}>
                        {passwordsMatch ? "✓ Passwords match" : "Passwords do not match"}
                      </span>
                    )}
                  </div>

                  {/* Encryption warning */}
                  <div
                    className="flex gap-3 px-3.5 py-3 rounded-xl text-xs leading-relaxed"
                    style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", color: "#93B4FF", fontFamily: "var(--font-inter)" }}
                  >
                    <span className="shrink-0 mt-0.5">🔒</span>
                    <span>
                      <strong>This password encrypts all your entries.</strong> If you lose it,
                      your journal cannot be recovered — there is no reset. Write it down somewhere safe.
                    </span>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs px-3.5 py-2.5 rounded-xl"
                      style={{ color: "#FCA5A5", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontFamily: "var(--font-inter)" }}
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 mt-1"
                    style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", boxShadow: "0 0 24px rgba(37,99,235,0.4)", fontFamily: "var(--font-inter)" }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 0 42px rgba(37,99,235,0.7)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 24px rgba(37,99,235,0.4)" }}
                  >
                    {loading ? "Sending code…" : "Send verification code →"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 2: Email verification ────────────────────── */}
            {step === "verify" && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                {/* Header */}
                <div className="flex flex-col gap-1 text-center">
                  <div className="text-3xl mb-1">📬</div>
                  <h1
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
                  >
                    Check your inbox
                  </h1>
                  <p className="text-sm" style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}>
                    We sent a 6-digit code to
                  </p>
                  <p className="text-sm font-semibold truncate px-2" style={{ color: "#93B4FF", fontFamily: "var(--font-inter)" }}>
                    {email}
                  </p>
                </div>

                <form onSubmit={handleVerify} className="flex flex-col gap-5">
                  {/* OTP input boxes */}
                  <div className="flex gap-2 justify-center">
                    {codeInputs.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { boxRefs.current[idx] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleBoxChange(idx, e.target.value)}
                        onKeyDown={(e) => handleBoxKeyDown(idx, e)}
                        onFocus={(e) => e.currentTarget.select()}
                        disabled={verifying}
                        className="w-11 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all duration-150 disabled:opacity-50"
                        style={{
                          background: digit ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.05)",
                          border: `1.5px solid ${digit ? "rgba(37,99,235,0.6)" : "rgba(255,255,255,0.12)"}`,
                          color: "#F0F0F0",
                          fontFamily: "monospace",
                        }}
                      />
                    ))}
                  </div>

                  {/* Error */}
                  {verifyError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs px-3.5 py-2.5 rounded-xl text-center"
                      style={{ color: "#FCA5A5", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontFamily: "var(--font-inter)" }}
                    >
                      {verifyError}
                    </motion.p>
                  )}

                  {/* Verify button */}
                  <button
                    type="submit"
                    disabled={verifying || codeInputs.join("").length < 6}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", boxShadow: "0 0 24px rgba(37,99,235,0.4)", fontFamily: "var(--font-inter)" }}
                    onMouseEnter={(e) => { if (!verifying) e.currentTarget.style.boxShadow = "0 0 42px rgba(37,99,235,0.7)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 24px rgba(37,99,235,0.4)" }}
                  >
                    {verifying ? "Verifying…" : "Verify email"}
                  </button>
                </form>

                {/* Resend + back */}
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs" style={{ color: "#555570", fontFamily: "var(--font-inter)" }}>
                    Didn&apos;t get it?{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0}
                      className="font-medium transition-colors duration-150 disabled:cursor-not-allowed"
                      style={{ color: cooldown > 0 ? "#555570" : "#2563EB", fontFamily: "var(--font-inter)" }}
                      onMouseEnter={(e) => { if (cooldown === 0) e.currentTarget.style.color = "#93B4FF" }}
                      onMouseLeave={(e) => { if (cooldown === 0) e.currentTarget.style.color = "#2563EB" }}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </button>
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStep("form"); setVerifyError(""); setCodeInputs(["","","","","",""]) }}
                    className="text-xs transition-colors duration-150"
                    style={{ color: "#555570", fontFamily: "var(--font-inter)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#8B8BA7")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#555570")}
                  >
                    ← Change email address
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step === "form" && (
          <p className="text-sm text-center" style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}>
            Already have a vault?{" "}
            <Link
              href="/login"
              className="font-medium transition-colors duration-200"
              style={{ color: "#2563EB" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#93B4FF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#2563EB")}
            >
              Sign in
            </Link>
          </p>
        )}
      </motion.div>
    </main>
    </>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
