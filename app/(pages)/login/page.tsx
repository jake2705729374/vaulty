"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import AuthNav from "@/components/AuthNav"

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  // Derive justVerified from the URL param at first render — no effect needed
  const [justVerified] = useState(() => searchParams.get("verified") === "1")
  const [email, setEmail]           = useState("")
  const [password, setPassword]     = useState("")
  const [showPw, setShowPw]         = useState(false)
  const [error, setError]           = useState("")
  const [unverified, setUnverified] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [resending, setResending]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setUnverified(false)
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      // Check whether the failure is due to an unverified email
      try {
        const check = await fetch(
          `/api/auth/check-verification?email=${encodeURIComponent(email)}`
        )
        const { unverified: isUnverified } = await check.json()
        if (isUnverified) {
          setUnverified(true)
          return
        }
      } catch {
        // Network error on check — fall through to generic message
      }
      setError("Invalid email or password.")
    } else {
      sessionStorage.setItem("masterPassword", password)
      // Flag the dashboard to show the welcome splash — consumed once on arrival
      sessionStorage.setItem("showWelcomeSplash", "1")
      router.push("/dashboard")
    }
  }

  async function handleResendAndRedirect() {
    setResending(true)
    try {
      await fetch("/api/auth/resend-verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })
    } catch {
      // Even if resend fails, redirect so they can try again
    }
    setResending(false)
    router.push(`/register?email=${encodeURIComponent(email)}&verify=1`)
  }

  return (
    <>
    <AuthNav page="login" />
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
          <div className="flex flex-col gap-1">
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
            >
              Welcome back
            </h1>
            <p
              className="text-sm"
              style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
            >
              Sign in to your encrypted journal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email verified success */}
            {justVerified && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs px-3.5 py-2.5 rounded-xl"
                style={{
                  color: "#86EFAC",
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  fontFamily: "var(--font-inter)",
                }}
              >
                ✓ Email verified! Sign in to access your vault.
              </motion.p>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
              >
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
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#F0F0F0",
                  fontFamily: "var(--font-inter)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
              >
                Master password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-16 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#F0F0F0",
                    fontFamily: "var(--font-inter)",
                  }}
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
              <p
                className="text-xs"
                style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
              >
                This is your encryption key — it cannot be reset.
              </p>
            </div>

            {/* Unverified account notice */}
            {unverified && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 px-3.5 py-3 rounded-xl text-xs"
                style={{
                  color: "#FDE68A",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  fontFamily: "var(--font-inter)",
                }}
              >
                <p>
                  <strong>Email not verified.</strong> You signed up but didn&apos;t
                  confirm your email yet.
                </p>
                <button
                  type="button"
                  onClick={handleResendAndRedirect}
                  disabled={resending}
                  className="self-start font-semibold underline underline-offset-2 transition-opacity duration-150 disabled:opacity-50"
                  style={{ color: "#FDE68A", fontFamily: "var(--font-inter)" }}
                >
                  {resending ? "Sending code…" : "Resend verification code →"}
                </button>
              </motion.div>
            )}

            {/* Generic error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs px-3.5 py-2.5 rounded-xl"
                style={{
                  color: "#FCA5A5",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  fontFamily: "var(--font-inter)",
                }}
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 mt-1"
              style={{
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                boxShadow: "0 0 24px rgba(37,99,235,0.4)",
                fontFamily: "var(--font-inter)",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.currentTarget.style.boxShadow = "0 0 42px rgba(37,99,235,0.7)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 24px rgba(37,99,235,0.4)"
              }}
            >
              {loading ? "Signing in…" : "Sign in to your vault"}
            </button>
          </form>
        </div>

        <p
          className="text-sm text-center"
          style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
        >
          No account?{" "}
          <Link
            href="/register"
            className="font-medium transition-colors duration-200"
            style={{ color: "#2563EB" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#93B4FF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2563EB")}
          >
            Create your vault
          </Link>
        </p>
      </motion.div>
    </main>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
