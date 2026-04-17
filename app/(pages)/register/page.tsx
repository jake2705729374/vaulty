"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? "Registration failed.")
      setLoading(false)
      return
    }

    // Auto sign-in after registration
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError("Account created but sign-in failed. Please log in.")
      router.push("/login")
    } else {
      sessionStorage.setItem("masterPassword", password)
      router.push("/journal")
    }
  }

  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-md border border-theme p-8">
        <h1 className="text-2xl font-serif font-semibold text-ink mb-1">Create your journal</h1>
        <p className="text-sm text-ink-muted mb-6">Private. Encrypted. Yours alone.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-theme bg-surface text-ink text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">Master password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-theme bg-surface text-ink text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">Confirm password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-theme bg-surface text-ink text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
              placeholder="••••••••"
            />
          </div>

          <div className="bg-surface-2 border border-theme rounded-lg p-3 text-xs text-accent">
            <strong>Important:</strong> Your password encrypts all your entries. If you lose it,
            your entries cannot be recovered. There is no password reset.
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--color-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-ink-muted text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
