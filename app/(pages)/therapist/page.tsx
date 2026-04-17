"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function TherapistPage() {
  const { status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm here to help you reflect. What's on your mind today?",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: "user", content: text }
    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setInput("")
    setLoading(true)

    // Append empty assistant bubble to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    const historyForApi = updatedHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await fetch("/api/therapist/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyForApi.slice(0, -1) }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + chunk },
          ]
        })
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Something went wrong. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") return null

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-lg mx-auto min-h-screen bg-surface shadow-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-theme">
          <Link href="/journal" className="text-sm text-ink-muted hover:text-ink transition-colors">
            ← Journal
          </Link>
          <h1 className="text-base font-serif font-semibold text-ink">Reflect</h1>
          <div className="w-12" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-white rounded-tr-sm"
                    : "bg-surface-2 text-ink rounded-tl-sm"
                }`}
                style={
                  msg.role === "user"
                    ? { backgroundColor: "var(--color-accent)" }
                    : undefined
                }
              >
                {msg.content || (
                  <span className="animate-pulse text-ink-faint">Thinking…</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-ink-faint px-6 pb-1">
          Not a substitute for professional mental health care.
        </p>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="px-4 pb-6 pt-2 flex gap-2 border-t border-theme"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Share what's on your mind…"
            className="flex-1 px-3 py-2 rounded-full border border-theme bg-surface text-ink text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{ borderColor: "var(--color-border)" }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white disabled:opacity-40 transition-colors flex-shrink-0"
            style={{ backgroundColor: "var(--color-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
            aria-label="Send"
          >
            ↑
          </button>
        </form>
      </div>
    </div>
  )
}
