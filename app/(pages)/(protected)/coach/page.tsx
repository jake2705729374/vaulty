"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import PageTransition from "@/components/PageTransition"
import { type CoachContext } from "@/components/CoachPanel"

interface Message {
  role:       "user" | "assistant"
  content:    string
  streaming?: boolean
}

// ── Icons ─────────────────────────────────────────────────────────────────
function IconSparkles({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width={size} height={size}>
      <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.239a1 1 0 0 0 0 1.962l1.192.24a1 1 0 0 1 .785.783l.239 1.192a1 1 0 0 0 1.962 0l.24-1.192a1 1 0 0 1 .783-.784l1.192-.24a1 1 0 0 0 0-1.962l-1.192-.239a1 1 0 0 1-.784-.785l-.24-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
    </svg>
  )
}

function IconPaperPlane() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export default function CoachPage() {
  const { status } = useSession()
  const router     = useRouter()

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey — I'm your coach. What's on your mind today?" },
  ])
  const [input,        setInput]        = useState("")
  const [loading,      setLoading]      = useState(false)
  const [coachContext, setCoachContext] = useState<CoachContext | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load coach context from preferences
  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/user/preferences")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        const people  = data.coachPeople     ? JSON.parse(data.coachPeople)     : []
        const lifeCtx = data.coachLifeContext ? JSON.parse(data.coachLifeContext) : {}
        setCoachContext({
          displayName: data.displayName ?? null,
          people,
          lifePhase:   lifeCtx.phase      ?? null,
          situations:  lifeCtx.situations ?? [],
        })
      })
      .catch(() => { /* non-fatal */ })
  }, [status])

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim()
    if (!text || loading) return

    const userMsg: Message = { role: "user", content: text }
    const updatedHistory   = [...messages, userMsg]
    setMessages(updatedHistory)
    setInput("")
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = "auto"
    setLoading(true)

    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }])

    const historyForApi = updatedHistory.map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch("/api/coach/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:      text,
          history:      historyForApi.slice(0, -1),
          coachContext,
          entryContent: "",
        }),
      })

      if (!res.ok || !res.body) throw new Error("Request failed")

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
        })
      }

      // Resolve any AI_ERROR tokens
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        const content = last.content
        if (content.startsWith("[AI_ERROR:") && content.endsWith("]")) {
          return [...prev.slice(0, -1), { ...last, content: content.slice(10, -1).trim(), streaming: false }]
        }
        return [...prev.slice(0, -1), { ...last, streaming: false }]
      })
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Could not reach the AI. Check your connection and try again.", streaming: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (status === "loading") return null

  return (
    <PageTransition>
      <div className="min-h-screen bg-page flex flex-col">

        {/* ── Sticky nav header ─────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-40 border-b flex-shrink-0"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center justify-between px-4 md:px-8 h-14 max-w-screen-xl mx-auto gap-4">

            {/* Left: back link + journal name */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm font-inter transition-colors h-9 px-2 rounded-lg shrink-0"
                style={{ color: "var(--color-ink-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-ink)"
                  e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-ink-muted)"
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
              >
                <IconChevronLeft />
                Dashboard
              </Link>
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: "var(--color-border)" }} />
              <h1 className="text-base font-sora font-semibold text-ink truncate">
                {coachContext?.displayName ? `${coachContext.displayName}'s Journal` : "My Journal"}
              </h1>
            </div>

            {/* Right: Coach label */}
            <div className="flex items-center gap-1.5 shrink-0" style={{ color: "var(--color-ink-muted)" }}>
              <IconSparkles size={14} />
              <span className="text-sm font-inter font-medium">Coach</span>
            </div>
          </div>
        </header>

        {/* ── Chat area ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 w-full">

          {/* Messages — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

            {/* Greeting / no-profile nudge */}
            {!coachContext?.people?.length && !coachContext?.lifePhase && messages.length <= 1 && (
              <div
                className="flex items-center gap-2.5 p-3 rounded-xl text-xs font-inter mb-2"
                style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-ink-faint)" }}
              >
                <IconSparkles size={13} />
                <span>Set up your <Link href="/settings#coach-profile" className="underline" style={{ color: "var(--color-accent)" }}>Coach Profile</Link> in Settings for personalised conversations.</span>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-inter leading-relaxed ${
                    msg.role === "user" ? "text-white rounded-tr-sm" : "rounded-tl-sm"
                  }`}
                  style={
                    msg.role === "user"
                      ? { backgroundColor: "var(--color-accent)" }
                      : { backgroundColor: "var(--color-surface-2)", color: "var(--color-ink)", border: "1px solid var(--color-border)" }
                  }
                >
                  {msg.content || (
                    <span className="animate-pulse" style={{ color: "var(--color-ink-faint)" }}>
                      Thinking…
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* ── Input bar — stays at bottom ─────────────────────────────── */}
          <div
            className="border-t px-4 pb-safe pt-3 pb-5 flex-shrink-0"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
          >
            <p className="text-[10px] font-inter text-center mb-2" style={{ color: "var(--color-ink-faint)" }}>
              Not a substitute for professional mental health care
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend() }}
              className="flex gap-2 items-end"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Share what's on your mind…"
                rows={1}
                className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-inter resize-none focus:outline-none focus:ring-2 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink)",
                  minHeight: 42,
                  maxHeight: 120,
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-2xl text-white disabled:opacity-40 transition-colors flex-shrink-0"
                style={{ backgroundColor: "var(--color-accent)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-hover, var(--color-accent))")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
                aria-label="Send"
              >
                <IconPaperPlane />
              </button>
            </form>
          </div>
        </div>

      </div>
    </PageTransition>
  )
}
