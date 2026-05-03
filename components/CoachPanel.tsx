"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { track } from "@/lib/analytics"

// ── Types ────────────────────────────────────────────────────────────────
export interface CoachPerson {
  name:         string
  relationship: string
  birthday?:    string    // "MM/DD" e.g. "03/15"
  closeness?:   string    // "very_close" | "close" | "complicated"
  traits?:      string[]  // personality descriptors
  notes?:       string    // anything the coach should know
}

export interface CoachContext {
  displayName: string | null
  people:      CoachPerson[]
  lifePhase:   string | null
  situations:  string[]
}

interface Message {
  role:      "user" | "assistant"
  content:   string
  streaming?: boolean
  saved?:    boolean  // true after persisted to DB
}

export interface CoachPanelProps {
  entryContent:     string           // live plain text from editor
  recentEntries?:   string[]         // decrypted entries (only when privacy toggle ON)
  coachContext:     CoachContext | null
  entryId?:         string | null    // persists chat history per entry
  onClose:          () => void
  onInsertToEntry:  (text: string) => void
  // When true the panel auto-fires "Polish Entry" as soon as it's ready
  pendingRefine?:   boolean
  onRefineConsumed?: () => void
}

// ── Situation → starter prompt ───────────────────────────────────────────
const SITUATION_PROMPTS: Record<string, string> = {
  "New job":             "How are you feeling about the new role so far?",
  "Breakup":             "How are you processing things emotionally right now?",
  "Grief":               "What's been helping you get through today?",
  "Health journey":      "How are you taking care of yourself lately?",
  "Celebration":         "What are you most proud of right now?",
  "Stress":              "What's weighing on you the most today?",
  "Major decision":      "What's making this decision feel hard?",
  "Relationship change": "How are you adjusting to the change?",
}

// ── Strip markdown for journal insertion ─────────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/^\s*[-*+]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .trim()
}

// ── Client-side keyword fallback: used when semantic retrieve API fails ──
function scoreRelevance(entry: string, query: string): number {
  const stopWords = new Set(["the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "who", "did", "any", "got", "let", "put", "say", "she", "too", "use"])
  const words = (text: string) =>
    text.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !stopWords.has(w))

  const entryWords  = new Set(words(entry))
  const queryWords  = words(query)
  if (!queryWords.length) return 0
  return queryWords.filter((w) => entryWords.has(w)).length / queryWords.length
}

function selectRelevantEntriesFallback(entries: string[], query: string, limit = 5): string[] {
  if (!entries.length) return []
  if (entries.length <= limit) return entries
  return entries
    .map((e, i) => ({ e, score: scoreRelevance(e, query), i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .sort((a, b) => a.i - b.i)
    .map((s) => s.e)
}

// ── Icons ────────────────────────────────────────────────────────────────
function IconXMark() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
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
function IconPlusEntry() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  )
}
function IconSparkles() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.239a1 1 0 0 0 0 1.962l1.192.24a1 1 0 0 1 .785.783l.239 1.192a1 1 0 0 0 1.962 0l.24-1.192a1 1 0 0 1 .783-.784l1.192-.24a1 1 0 0 0 0-1.962l-1.192-.239a1 1 0 0 1-.784-.785l-.24-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
    </svg>
  )
}

// ── Generate starter prompts from coach context ───────────────────────────
function getStarterPrompts(ctx: CoachContext | null): string[] {
  const prompts: string[] = []
  if (ctx?.people) {
    for (const person of ctx.people.slice(0, 2)) {
      prompts.push(`How are things with ${person.name}?`)
    }
  }
  if (ctx?.situations) {
    for (const sit of ctx.situations.slice(0, 1)) {
      const sitPrompt = SITUATION_PROMPTS[sit]
      if (sitPrompt) prompts.push(sitPrompt)
    }
  }
  prompts.push("What was the highlight of your day?")
  prompts.push("How are you feeling right now?")
  return [...new Set(prompts)].slice(0, 4)
}

// ── CoachPanel ────────────────────────────────────────────────────────────
export default function CoachPanel({
  entryContent,
  recentEntries,
  coachContext,
  entryId,
  onClose,
  onInsertToEntry,
  pendingRefine,
  onRefineConsumed,
}: CoachPanelProps) {
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState("")
  const [loading,       setLoading]       = useState(false)
  const [addedIdx,      setAddedIdx]      = useState<Set<number>>(new Set())
  const [historyLoaded, setHistoryLoaded] = useState(false)
  // When true, every message in this session uses the "refine" mode (entry rewriting)
  const [isRefineMode,  setIsRefineMode]  = useState(false)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)

  const starterPrompts = getStarterPrompts(coachContext)

  // ── Load existing chat history on mount ─────────────────────────────
  useEffect(() => {
    if (!entryId) { setHistoryLoaded(true); return }

    fetch(`/api/entries/${entryId}/chat`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { messages: { role: string; content: string }[] } | null) => {
        if (data?.messages?.length) {
          const loaded: Message[] = data.messages.map((m) => ({
            role:    m.role as "user" | "assistant",
            content: m.content,
            saved:   true,
          }))
          setMessages(loaded)
        }
        setHistoryLoaded(true)
      })
      .catch(() => setHistoryLoaded(true))
  }, [entryId])

  // ── Auto-fire "Polish Entry" when triggered from dictation panel ────
  // pendingRefine is set by the parent (JournalEditor) when the user clicks
  // "Open Coach & Polish Entry" in the post-transcription card.
  // We wait until history has loaded so we don't interrupt a loading state.
  useEffect(() => {
    if (!pendingRefine || !historyLoaded || loading) return
    onRefineConsumed?.()
    handleSend("Polish my notes into a journal entry", { refine: true })
  // handleSend is stable within the render; pendingRefine + historyLoaded are the real triggers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRefine, historyLoaded])

  // ── Auto-scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Save a single exchange directly — no React state dependency ──────
  const saveExchange = useCallback(
    async (userContent: string, assistantContent: string) => {
      // 1. Save chat history (only when inside an entry)
      if (entryId) {
        try {
          await fetch(`/api/entries/${entryId}/chat`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              messages: [
                { role: "user",      content: userContent      },
                { role: "assistant", content: assistantContent },
              ],
            }),
          })
        } catch { /* non-fatal */ }
      }

      // 2. Fire-and-forget: structured extraction + memory save
      // /api/coach/extract uses Claude Haiku to pull durable facts and saves
      // them to the Memory table — no more saving raw assistant text as memories.
      fetch("/api/coach/extract", {
        method:    "POST",
        headers:   { "Content-Type": "application/json" },
        body:      JSON.stringify({
          userMessage:       userContent,
          assistantResponse: assistantContent,
        }),
        keepalive: true,
      }).catch(() => { /* non-fatal */ })
    },
    [entryId],
  )

  // ── Fire-and-forget session summary on close ──────────────────────────
  const triggerSessionSummary = useCallback(
    (currentMessages: Message[]) => {
      const completed = currentMessages.filter((m) => !m.streaming && m.content)
      if (completed.length < 2) return  // need at least one exchange

      fetch("/api/session-summary", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages: completed.map((m) => ({ role: m.role, content: m.content })),
          entryId:  entryId ?? undefined,
        }),
        keepalive: true,
      }).catch(() => { /* non-fatal */ })
    },
    [entryId],
  )

  // ── Handle close: summarise session ──────────────────────────────────
  function handleClose() {
    triggerSessionSummary(messages)
    onClose()
  }

  // ── Send message ─────────────────────────────────────────────────────
  async function handleSend(text: string, opts?: { refine?: boolean }) {
    text = text.trim()
    if (!text || loading) return

    // If this is the first refine call, lock the session into refine mode so that
    // every follow-up message ("shorter", "more reflective") also uses the rewrite prompt.
    const refine = opts?.refine || isRefineMode
    if (opts?.refine) setIsRefineMode(true)

    track("coach_message_sent", {
      source:              "panel",
      mode:                refine ? "refine" : "coach",
      has_entry_context:   !!entryContent && entryContent.length > 0,
      has_recent_entries:  !!recentEntries && recentEntries.length > 0,
    })

    const userMsg: Message = { role: "user", content: text }
    const updatedHistory   = [...messages, userMsg]
    setMessages(updatedHistory)
    setInput("")
    setLoading(true)

    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }])

    const historyForApi = updatedHistory.map((m) => ({ role: m.role, content: m.content }))

    try {
      let elevated = false
      let relevantEntries: string[] | undefined

      if (refine) {
        // ── Refine mode: skip safety check + retrieval — go straight to rewrite ──
        // The "message" is a writing instruction, not a personal disclosure,
        // so the safety pre-check is not needed here.
      } else {
        // ── Step 1: Safety check + semantic retrieval in parallel ───────────
        const entryExcerpts = recentEntries && recentEntries.length > 5
          ? recentEntries.map((e, i) => ({
              idx:     i,
              excerpt: e.slice(0, 150).replace(/\s+/g, " ").trim(),
            }))
          : null

        const [safetyResult, retrieveResult] = await Promise.all([
          fetch("/api/coach/safety", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ message: text }),
          }).then((r) => r.ok ? r.json() : { risk: "safe" }).catch(() => ({ risk: "safe" })),

          entryExcerpts
            ? fetch("/api/coach/retrieve", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ query: text, entries: entryExcerpts }),
              }).then((r) => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
        ])

        // ── Step 2: Handle crisis — skip coach entirely ─────────────────────
        if (safetyResult.risk === "crisis") {
          const crisisMsg: string = safetyResult.response
            ?? "Please reach out to a crisis line right now: call or text **988** (US, free, 24/7)."
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), { ...last, content: crisisMsg, streaming: false }]
          })
          setLoading(false)
          return
        }

        elevated = safetyResult.risk === "elevated"

        // ── Step 3: Select relevant entries ────────────────────────────────
        if (recentEntries && recentEntries.length > 0) {
          if (retrieveResult?.indices?.length) {
            relevantEntries = (retrieveResult.indices as number[])
              .filter((i) => i >= 0 && i < recentEntries.length)
              .slice(0, 5)
              .map((i) => recentEntries[i])
          } else {
            relevantEntries = selectRelevantEntriesFallback(recentEntries, text)
          }
        }
      }

      // ── Step 4: Stream coach/refine response ────────────────────────────
      const res = await fetch("/api/coach/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:       text,
          history:       historyForApi.slice(0, -1),
          coachContext,
          entryContent,
          recentEntries: relevantEntries,
          elevated,
          mode:          refine ? "refine" : null,
        }),
      })

      if (!res.ok || !res.body) throw new Error("Request failed")

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      // Accumulate streamed text in a plain local variable — never inside
      // a setState updater — so we can reliably save it after streaming ends.
      let streamedContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        streamedContent += chunk
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
        })
      }

      // Resolve any error tokens from our local variable — no setState dependency
      const resolved = streamedContent.startsWith("[AI_ERROR:") && streamedContent.endsWith("]")
        ? streamedContent.slice(10, -1).trim()
        : streamedContent

      // Mark streaming complete in state
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), { ...last, content: resolved, streaming: false }]
      })

      // ── Step 5: Save exchange + fire-and-forget structured extraction ───
      await saveExchange(text, resolved)

    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Could not reach the AI. Check your internet connection and try again.", streaming: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    // isRefineMode is read inside handleSend via closure — no need to pass explicitly here
    handleSend(input)
  }

  function handleAddToEntry(content: string, idx: number) {
    onInsertToEntry(stripMarkdown(content))
    setAddedIdx((prev) => new Set(prev).add(idx))
    track("coach_insert_to_entry", {})
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  // Show a brief skeleton while history loads
  if (!historyLoaded) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="animate-pulse w-6 h-6 rounded-full" style={{ backgroundColor: "var(--color-border)" }} />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* ── Panel header ───────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 h-14 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--color-accent)" }}><IconSparkles /></span>
          <h2 className="text-sm font-sora font-semibold text-ink">Coach</h2>
          {recentEntries && recentEntries.length > 0 && (
            <span
              className="text-[10px] font-inter px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}
            >
              Journal context on
            </span>
          )}
          {isRefineMode && (
            <span
              className="text-[10px] font-inter px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)", border: "1px solid var(--color-accent)" }}
            >
              ✦ Writing mode
            </span>
          )}
          {entryId && messages.some((m) => m.saved) && (
            <span
              className="text-[10px] font-inter px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}
            >
              ↩ history loaded
            </span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--color-ink-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-surface-2)"; e.currentTarget.style.color = "var(--color-ink)" }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--color-ink-muted)" }}
          aria-label="Close coach"
        >
          <IconXMark />
        </button>
      </div>

      {/* ── No-profile nudge ────────────────────────────────────────────── */}
      {!coachContext?.people?.length && !coachContext?.lifePhase && (
        <div
          className="mx-4 mt-3 px-3 py-2.5 rounded-xl flex items-center gap-2 text-xs font-inter flex-shrink-0"
          style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
        >
          <span style={{ color: "var(--color-ink-faint)" }}>
            Set up your Coach Profile for personalised conversations.
          </span>
          <Link
            href="/settings#coach-profile"
            className="font-semibold flex-shrink-0 transition-colors"
            style={{ color: "var(--color-accent)" }}
          >
            Set up →
          </Link>
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">

        {/* Starter prompts — only when conversation is empty */}
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs font-inter text-center" style={{ color: "var(--color-ink-faint)" }}>
              {coachContext?.displayName
                ? `Hi ${coachContext.displayName} — what's on your mind?`
                : "What's on your mind?"}
            </p>

            {/* ── Polish Entry card — only shown when there's entry content to work with ── */}
            {entryContent.trim().length > 30 && (
              <div>
                <button
                  onClick={() => handleSend("Polish my notes into a journal entry", { refine: true })}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all disabled:opacity-50 flex items-start gap-3"
                  style={{
                    backgroundColor: "var(--color-surface-2)",
                    border:          "1px solid var(--color-accent)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85" }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
                >
                  <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-accent)" }}>
                    <IconSparkles />
                  </span>
                  <div>
                    <p className="text-sm font-inter font-medium" style={{ color: "var(--color-accent)" }}>
                      Polish entry into journal prose
                    </p>
                    <p className="text-xs font-inter mt-0.5" style={{ color: "var(--color-ink-faint)" }}>
                      Turns your rough notes into a cohesive journal entry
                    </p>
                  </div>
                </button>
                <p className="text-[10px] font-inter text-center mt-1" style={{ color: "var(--color-ink-faint)" }}>
                  Your entry text will be sent to Claude to rewrite
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center">
              {starterPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="text-xs font-inter px-3 py-2 rounded-xl transition-colors text-left disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--color-surface-2)",
                    color: "var(--color-ink-muted)",
                    border: "1px solid var(--color-border)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-ink)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-surface-2)"; e.currentTarget.style.color = "var(--color-ink-muted)" }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History divider — shown when messages were loaded from DB */}
        {messages.some((m) => m.saved) && messages.some((m) => !m.saved) && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
            <span className="text-[10px] font-inter" style={{ color: "var(--color-ink-faint)" }}>previous session</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm font-inter leading-relaxed ${
                msg.role === "user" ? "rounded-tr-sm text-white" : "rounded-tl-sm"
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

            {/* Add to entry — only on completed assistant messages */}
            {msg.role === "assistant" && !msg.streaming && msg.content && (
              <button
                onClick={() => handleAddToEntry(msg.content, i)}
                disabled={addedIdx.has(i)}
                className="mt-1.5 flex items-center gap-1 text-[11px] font-inter px-2 py-1 rounded-lg transition-colors disabled:opacity-60"
                style={{
                  color: addedIdx.has(i) ? "var(--color-ink-faint)" : "var(--color-accent)",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => { if (!addedIdx.has(i)) e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                title="Add to journal entry"
              >
                <IconPlusEntry />
                {addedIdx.has(i) ? "Added" : "Add to entry"}
              </button>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Polish pill — always visible when entry has content ────────── */}
      {entryContent.trim().length > 30 && (
        <div className="px-4 pt-2 flex-shrink-0 flex justify-center">
          <button
            onClick={() => handleSend("Re-polish with my latest notes", { refine: true })}
            disabled={loading}
            className="text-xs font-inter px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all disabled:opacity-40"
            style={{
              border:          "1px solid var(--color-accent)",
              color:           "var(--color-accent)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-accent) 10%, transparent)" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
          >
            <IconSparkles />
            {isRefineMode ? "Re-polish with latest notes" : "Polish entry"}
          </button>
        </div>
      )}

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div
        className="px-4 pb-4 pt-2 border-t flex-shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <form onSubmit={handleFormSubmit} className="flex gap-2 items-end">
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
            placeholder={isRefineMode ? "Make it shorter, more reflective, change the tone…" : "Ask your coach…"}
            rows={1}
            className="flex-1 px-3 py-2 rounded-xl text-sm font-inter resize-none focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-ink)",
              minHeight: 40,
              maxHeight: 120,
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white disabled:opacity-40 transition-colors flex-shrink-0"
            style={{ backgroundColor: "var(--color-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
            aria-label="Send"
          >
            <IconPaperPlane />
          </button>
        </form>
        <p className="text-[10px] font-inter text-center mt-2" style={{ color: "var(--color-ink-faint)" }}>
          Not a substitute for professional mental health care
        </p>
      </div>
    </div>
  )
}
