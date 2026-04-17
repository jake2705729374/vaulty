"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Invalid email or password.")
    } else {
      // Store password in sessionStorage for client-side key derivation
      sessionStorage.setItem("masterPassword", password)
      router.push("/journal")
    }
  }

  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-md border border-theme p-8">
        <h1 className="text-2xl font-serif font-semibold text-ink mb-1">Welcome back</h1>
        <p className="text-sm text-ink-muted mb-6">Sign in to your journal</p>

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
            <p className="text-xs text-ink-faint mt-1">
              This password encrypts your entries. It cannot be reset.
            </p>
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-ink-muted text-center mt-6">
          No account?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
