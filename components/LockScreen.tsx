"use client"

import { useState } from "react"

interface LockScreenProps {
  onUnlock: (password: string) => void
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setError("")
    onUnlock(password)
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-xs bg-surface rounded-2xl shadow-md border border-theme p-8 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-serif font-semibold text-ink mb-1">Your journal is locked</h2>
        <p className="text-sm text-ink-muted mb-6">Enter your master password to unlock</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-surface text-ink text-sm text-center focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--color-border)", outlineColor: "var(--color-accent)" }}
            placeholder="Master password"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 text-white text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: "var(--color-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}
