"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import PageTransition from "@/components/PageTransition"
import { type CoachContext } from "@/components/CoachPanel"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
  role:       "user" | "assistant"
  content:    string
  streaming?: boolean
}

interface SessionItem {
  id:        string
  title:     string
  createdAt: string
  updatedAt: string
  preview:   string
  lastRole:  string
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      width="16" height="16">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function IconPencilSquare() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
      <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff < 7)  return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function groupSessions(sessions: SessionItem[]): { label: string; items: SessionItem[] }[] {
  const now    = new Date()
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yest   = today - 86_400_000
  const week   = today - 6 * 86_400_000

  const groups: Record<string, SessionItem[]> = {
    Today: [], Yesterday: [], "Previous 7 days": [], Older: [],
  }

  for (const s of sessions) {
    const t = new Date(s.updatedAt).getTime()
    if (t >= today)   groups["Today"].push(s)
    else if (t >= yest) groups["Yesterday"].push(s)
    else if (t >= week) groups["Previous 7 days"].push(s)
    else              groups["Older"].push(s)
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Hey — I'm your coach. What's on your mind today?",
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const { status }    = useSession()
  const router        = useRouter()

  // ── Auth redirect
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  // ── Core state
  const [messages,       setMessages]       = useState<Message[]>([WELCOME_MESSAGE])
  const [input,          setInput]          = useState("")
  const [loading,        setLoading]        = useState(false)
  const [coachContext,   setCoachContext]   = useState<CoachContext | null>(null)

  // ── Session state
  const [sessions,       setSessions]       = useState<SessionItem[]>([])
  const [activeSession,  setActiveSession]  = useState<string | null>(null)  // null = unsaved new chat
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [sidebarOpen,    setSidebarOpen]    = useState(false)   // mobile drawer
  const [deletingId,     setDeletingId]     = useState<string | null>(null)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // ── Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Load coach context
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
      .catch(() => {})
  }, [status])

  // ── Load sessions list
  const loadSessions = useCallback(async () => {
    try {
      const r = await fetch("/api/coach/sessions")
      if (r.ok) {
        const data = await r.json() as SessionItem[]
        setSessions(data)
      }
    } catch { /* non-fatal */ }
    setSessionsLoaded(true)
  }, [])

  useEffect(() => {
    if (status === "authenticated") loadSessions()
  }, [status, loadSessions])

  // ── Load a specific session's messages
  async function openSession(id: string) {
    setSidebarOpen(false)
    if (id === activeSession) return
    setMessages([])
    setActiveSession(id)
    try {
      const r = await fetch(`/api/coach/sessions/${id}`)
      if (r.ok) {
        const data = await r.json() as { messages: { role: string; content: string }[] }
        if (data.messages.length > 0) {
          setMessages(data.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })))
        } else {
          setMessages([WELCOME_MESSAGE])
        }
      }
    } catch { /* keep blank */ }
  }

  // ── Start a new chat
  function newChat() {
    setActiveSession(null)
    setMessages([WELCOME_MESSAGE])
    setInput("")
    setSidebarOpen(false)
    inputRef.current?.focus()
  }

  // ── Delete a session
  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await fetch(`/api/coach/sessions/${id}`, { method: "DELETE" })
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (activeSession === id) newChat()
    } catch { /* non-fatal */ }
    setDeletingId(null)
  }

  // ── Send a message
  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim()
    if (!text || loading) return

    const userMsg: Message = { role: "user", content: text }
    const newMessages      = [...messages.filter((m) => !m.streaming), userMsg]
    setMessages(newMessages)
    setInput("")
    if (inputRef.current) inputRef.current.style.height = "auto"
    setLoading(true)

    // ── Ensure we have a session in DB ──────────────────────────────────
    let sessionId = activeSession
    if (!sessionId) {
      try {
        const title = text.slice(0, 60) + (text.length > 60 ? "…" : "")
        const r     = await fetch("/api/coach/sessions", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ title }),
        })
        if (r.ok) {
          const created = await r.json() as { id: string; title: string; createdAt: string }
          sessionId = created.id
          setActiveSession(created.id)
          // Optimistically add to sidebar list
          setSessions((prev) => [{
            id:        created.id,
            title:     created.title,
            createdAt: created.createdAt,
            updatedAt: created.createdAt,
            preview:   text.slice(0, 80),
            lastRole:  "user",
          }, ...prev])
        }
      } catch { /* non-fatal — continue without persisting */ }
    }

    // ── Save user message ───────────────────────────────────────────────
    if (sessionId) {
      fetch(`/api/coach/sessions/${sessionId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role: "user", content: text }),
      }).catch(() => {})
    }

    // ── Stream AI response ──────────────────────────────────────────────
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }])

    const historyForApi = newMessages.filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }))

    let assistantText = ""

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
        assistantText += chunk
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
        })
      }

      // Resolve any AI_ERROR tokens
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last.content.startsWith("[AI_ERROR:") && last.content.endsWith("]")) {
          assistantText = last.content.slice(10, -1).trim()
          return [...prev.slice(0, -1), { ...last, content: assistantText, streaming: false }]
        }
        return [...prev.slice(0, -1), { ...last, streaming: false }]
      })
    } catch {
      assistantText = "Could not reach the AI. Check your connection and try again."
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: assistantText, streaming: false },
      ])
    } finally {
      setLoading(false)
    }

    // ── Save assistant message + refresh sessions list ──────────────────
    if (sessionId && assistantText) {
      fetch(`/api/coach/sessions/${sessionId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role: "assistant", content: assistantText }),
      })
        .then(() => {
          // Auto-rename: fire after the 4th message (2nd full exchange).
          // newMessages has [user1, asst1, user2] at this point; +1 for the
          // assistant reply just saved = 4 total.
          const totalAfterSave = newMessages.length + 1
          if (totalAfterSave === 4) {
            fetch(`/api/coach/sessions/${sessionId}/generate-title`, {
              method: "POST",
            })
              .then((r) => r.ok ? r.json() : null)
              .then((data) => {
                if (data?.title) {
                  // Update title in sidebar list immediately
                  setSessions((prev) =>
                    prev.map((s) => s.id === sessionId ? { ...s, title: data.title } : s),
                  )
                }
              })
              .catch(() => {/* non-fatal */})
          }
          return loadSessions()
        })
        .catch(() => {})
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  if (status === "loading") return null

  const grouped = groupSessions(sessions)

  // ─────────────────────────────────────────────────────────────────────
  // Sessions sidebar (shared between desktop panel + mobile drawer)
  // ─────────────────────────────────────────────────────────────────────
  function SessionsSidebar() {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <IconClock />
            <span className="text-xs font-inter font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-ink-faint)" }}>
              History
            </span>
          </div>
          <button
            onClick={newChat}
            title="New chat"
            className="flex items-center gap-1.5 text-xs font-inter font-medium px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-ink-muted)", backgroundColor: "var(--color-surface-2)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-border)"
              e.currentTarget.style.color           = "var(--color-ink)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
              e.currentTarget.style.color           = "var(--color-ink-muted)"
            }}
          >
            <IconPencilSquare />
            New chat
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {!sessionsLoaded && (
            <p className="text-xs font-inter px-4 py-3" style={{ color: "var(--color-ink-faint)" }}>
              Loading…
            </p>
          )}

          {sessionsLoaded && sessions.length === 0 && (
            <p className="text-xs font-inter px-4 py-3 leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
              Your conversations will appear here.
            </p>
          )}

          {grouped.map(({ label, items }) => (
            <div key={label} className="mb-3">
              <p className="text-[10px] font-inter font-semibold uppercase tracking-widest px-4 pb-1 pt-2"
                style={{ color: "var(--color-ink-faint)" }}>
                {label}
              </p>
              {items.map((s) => {
                const isActive = s.id === activeSession
                return (
                  <div
                    key={s.id}
                    onClick={() => void openSession(s.id)}
                    className="group relative flex items-start gap-2 mx-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isActive ? "var(--color-surface-2)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                        style={{ backgroundColor: "var(--color-accent)" }}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-inter font-medium truncate leading-snug"
                        style={{ color: isActive ? "var(--color-ink)" : "var(--color-ink-muted)" }}>
                        {s.title}
                      </p>
                      <p className="text-[10px] font-inter mt-0.5" style={{ color: "var(--color-ink-faint)" }}>
                        {relativeDate(s.updatedAt)}
                      </p>
                    </div>

                    {/* Delete button — shown on hover */}
                    <button
                      onClick={(e) => void deleteSession(s.id, e)}
                      disabled={deletingId === s.id}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-all"
                      style={{ color: "var(--color-ink-faint)" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}
                      title="Delete conversation"
                    >
                      <IconTrash />
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-page)" }}>

        {/* ── Sticky nav header ──────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-40 border-b flex-shrink-0"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between px-4 md:px-6 h-14 max-w-full gap-4">

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

            <div className="flex items-center gap-3">
              {/* Coach label */}
              <div className="hidden sm:flex items-center gap-1.5" style={{ color: "var(--color-ink-muted)" }}>
                <IconSparkles size={14} />
                <span className="text-sm font-inter font-medium">Coach</span>
              </div>
              {/* Mobile: history button */}
              <button
                className="md:hidden flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-inter font-medium transition-colors"
                style={{ color: "var(--color-ink-muted)", backgroundColor: "var(--color-surface-2)" }}
                onClick={() => setSidebarOpen(true)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-border)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
              >
                <IconMenu />
                History
              </button>
            </div>
          </div>
        </header>

        {/* ── Body: chat + sidebar ──────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Main chat column ─────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">

            {/* Messages — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
              <div className="max-w-2xl mx-auto space-y-4">

                {/* No-profile nudge */}
                {!coachContext?.people?.length && !coachContext?.lifePhase && messages.length <= 1 && (
                  <div
                    className="flex items-center gap-2.5 p-3 rounded-xl text-xs font-inter"
                    style={{
                      backgroundColor: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-ink-faint)",
                    }}
                  >
                    <IconSparkles size={13} />
                    <span>
                      Set up your{" "}
                      <Link href="/settings#coach-profile" className="underline" style={{ color: "var(--color-accent)" }}>
                        Coach Profile
                      </Link>{" "}
                      in Settings for personalised conversations.
                    </span>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-inter leading-relaxed ${
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
            </div>

            {/* ── Input bar ──────────────────────────────────────────────── */}
            <div
              className="border-t flex-shrink-0"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
            >
              <div className="max-w-2xl mx-auto px-4 md:px-6 pt-3 pb-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px) + 1.5rem)" }}>
                <p className="text-[10px] font-inter text-center mb-2.5" style={{ color: "var(--color-ink-faint)" }}>
                  Not a substitute for professional mental health care
                </p>
                <form
                  onSubmit={(e) => { e.preventDefault(); void handleSend() }}
                  className="flex gap-2 items-end"
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      e.target.style.height = "auto"
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    placeholder="Share what's on your mind…"
                    rows={1}
                    className="flex-1 px-4 py-3 rounded-2xl text-sm font-inter resize-none focus:outline-none focus:ring-2 disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--color-surface-2)",
                      border:          "1px solid var(--color-border)",
                      color:           "var(--color-ink)",
                      minHeight:       46,
                      maxHeight:       140,
                      lineHeight:      "1.5",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl text-white disabled:opacity-40 transition-colors flex-shrink-0"
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

          {/* ── Desktop sessions sidebar (right) ─────────────────────────── */}
          <div
            className="hidden md:flex flex-col border-l flex-shrink-0"
            style={{
              width: 260,
              borderColor:     "var(--color-border)",
              backgroundColor: "var(--color-surface)",
            }}
          >
            <SessionsSidebar />
          </div>
        </div>

        {/* ── Mobile sessions drawer (slide-in overlay) ─────────────────── */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Panel */}
            <div
              className="md:hidden fixed right-0 top-0 bottom-0 z-50 flex flex-col shadow-2xl"
              style={{
                width:           "min(85vw, 320px)",
                backgroundColor: "var(--color-surface)",
                borderLeft:      "1px solid var(--color-border)",
              }}
            >
              {/* Close button */}
              <div className="flex items-center justify-between px-4 pt-4 pb-0">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-xs"
                  style={{ color: "var(--color-ink-muted)", backgroundColor: "var(--color-surface-2)" }}
                >
                  ✕
                </button>
              </div>
              <SessionsSidebar />
            </div>
          </>
        )}

      </div>
    </PageTransition>
  )
}
