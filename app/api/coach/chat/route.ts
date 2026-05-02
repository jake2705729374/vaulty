import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { anthropic } from "@/lib/ai/claude"
import { COACH_BASE_PROMPT, REFINE_ENTRY_PROMPT } from "@/lib/ai/prompts"

interface CoachPerson {
  name:         string
  relationship: string
  birthday?:    string
  closeness?:   string
  traits?:      string[]
  notes?:       string
}

interface CoachContext {
  displayName:  string | null
  people:       CoachPerson[]
  lifePhase:    string | null
  situations:   string[]
}

interface HistoryMessage {
  role:    "user" | "assistant"
  content: string
}

/** Returns number of days until next birthday (MM/DD), or null if no birthday / invalid. */
function daysUntilBirthday(birthday: string): number | null {
  const match = birthday.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!match) return null
  const month = parseInt(match[1], 10) - 1
  const day   = parseInt(match[2], 10)
  const now   = new Date()
  let next = new Date(now.getFullYear(), month, day)
  if (next.getTime() < now.setHours(0, 0, 0, 0)) {
    next = new Date(now.getFullYear() + 1, month, day)
  }
  return Math.round((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

/**
 * Builds the dynamic user-context block.
 * This is NOT cached (changes per user) — the stable base rules are cached separately.
 */
interface HabitForContext {
  name: string
  logs: { date: string }[]
}

function buildContextBlock(
  coachContext:    CoachContext | null,
  entryContent:    string,
  recentEntries:   string[],
  memories:        string[],
  sessionSummaries:string[],
  userBio:         string | null,
  coachStyle:      string | null,
  elevated:        boolean = false,
  habits:          HabitForContext[] = [],
): string {
  const parts: string[] = []

  // Safety flag injected by the pre-check — must come before any other context
  if (elevated) {
    parts.push(
      `⚠️ Safety note: The user's message triggered an elevated-concern flag. ` +
      `Respond with extra warmth and emotional attunement. ` +
      `Gently acknowledge what they're feeling before anything else. ` +
      `If distress seems significant, softly encourage them to talk to someone they trust or a mental health professional.`,
    )
  }

  if (userBio?.trim()) {
    parts.push(`About the user: ${userBio.trim()}`)
  }

  if (coachStyle && coachStyle !== "balanced") {
    const styleMap: Record<string, string> = {
      gentle:      "Be especially gentle, validating, and emotionally supportive. Prioritise comfort over challenge.",
      direct:      "Be direct and concise. Skip the softening — give practical, honest feedback.",
      challenging: "Be encouraging but willing to gently challenge assumptions and push for growth.",
    }
    const styleNote = styleMap[coachStyle]
    if (styleNote) parts.push(`Coaching style preference: ${styleNote}`)
  }

  if (coachContext?.displayName) {
    parts.push(`The user's name is ${coachContext.displayName}.`)
  }

  if (coachContext?.people && coachContext.people.length > 0) {
    const today    = new Date()
    const peopleLines = coachContext.people.map((p: CoachPerson) => {
      const details: string[] = []
      if (p.closeness)         details.push(p.closeness.replace(/_/g, " "))
      if (p.birthday) {
        const days = daysUntilBirthday(p.birthday)
        if (days !== null && days <= 7) {
          details.push(days === 0 ? "🎂 birthday TODAY" : `🎂 birthday in ${days} day${days === 1 ? "" : "s"}`)
        } else {
          details.push(`birthday ${p.birthday}`)
        }
      }
      if (p.traits?.length)    details.push(`personality: ${p.traits.join(", ")}`)
      if (p.notes?.trim())     details.push(`note: ${p.notes.trim()}`)
      const detailStr = details.length ? ` — ${details.join("; ")}` : ""
      return `  • ${p.name} (${p.relationship})${detailStr}`
    })
    // Flag upcoming birthdays at the top
    const upcoming = coachContext.people
      .filter((p) => p.birthday && (daysUntilBirthday(p.birthday) ?? 999) <= 7)
    if (upcoming.length) {
      const names = upcoming.map((p) => {
        const d = daysUntilBirthday(p.birthday!)
        return d === 0 ? `${p.name}'s birthday is TODAY` : `${p.name}'s birthday is in ${d} day${d === 1 ? "" : "s"}`
      }).join("; ")
      parts.push(`⚠️ Relationship alert: ${names}. If relevant, acknowledge this naturally.`)
    }
    parts.push(`Key people in their life:\n${peopleLines.join("\n")}`)
    // Suppress the "today" variable unused warning
    void today
  }

  if (coachContext?.lifePhase) {
    parts.push(`Current life phase: ${coachContext.lifePhase}.`)
  }

  if (coachContext?.situations && coachContext.situations.length > 0) {
    parts.push(`Currently navigating: ${coachContext.situations.join(", ")}.`)
  }

  if (memories.length > 0) {
    parts.push(
      `\nSaved memories and insights from past conversations:\n${memories.map((m) => `  • ${m}`).join("\n")}\nUse these to show continuity — reference them when relevant, but don't recite them back verbatim.`,
    )
  }

  if (sessionSummaries.length > 0) {
    parts.push(
      `\nRecent coaching session notes (most recent first):\n${sessionSummaries.map((s) => `  • ${s}`).join("\n")}\nUse these to pick up where you left off and avoid repeating ground already covered.`,
    )
  }

  if (entryContent && entryContent.trim().length > 0) {
    parts.push(
      `\nHere is what the user is writing right now (treat this as live context — engage with it naturally, do not quote it back verbatim):\n\n${entryContent.trim()}`,
    )
  }

  if (recentEntries && recentEntries.length > 0) {
    const formattedEntries = recentEntries
      .slice(0, 5)  // RAG-reduced to top 5 by client before sending
      .filter(Boolean)
      .map((e, i) => `Entry ${i + 1}:\n${e.trim()}`)
      .join("\n\n---\n\n")

    parts.push(
      `\nMost relevant recent journal entries (pre-selected by relevance):\n\n${formattedEntries}`,
    )
  }

  // Habits — today's completion status so the coach can celebrate wins or encourage
  if (habits.length > 0) {
    // Use server UTC date — close enough for context purposes (within 1 day for any timezone)
    const todayIso = new Date().toISOString().slice(0, 10)
    const habitLines = habits.map((h) => {
      const doneToday = h.logs.some((l) => l.date === todayIso)
      return `  • ${h.name}: ${doneToday ? "✓ done today" : "○ not yet done today"}`
    })
    parts.push(
      `\nUser's tracked habits (today's status):\n${habitLines.join("\n")}\n` +
      `Reference these naturally — celebrate completions, gently encourage what's pending, but don't make every message about habits.`,
    )
  }

  return parts.join("\n")
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const {
    message,
    history        = [],
    coachContext   = null,
    entryContent   = "",
    recentEntries  = [],
    elevated       = false,
    mode           = null,
  }: {
    message:       string
    history:       HistoryMessage[]
    coachContext:  CoachContext | null
    entryContent:  string
    recentEntries: string[]
    elevated:      boolean
    mode:          "refine" | null
  } = await req.json()

  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 })
  }

  // ── Refine mode: transform raw notes into polished journal prose ────────────
  // Uses a dedicated prompt + entry content only. No coach context, no DB queries.
  if (mode === "refine") {
    const systemBlocks: { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[] = [
      {
        type:          "text",
        text:          REFINE_ENTRY_PROMPT,
        cache_control: { type: "ephemeral" },  // stable rules — cache this
      },
    ]

    if (entryContent.trim()) {
      systemBlocks.push({
        type: "text",
        text: `The user's current journal notes to transform:\n\n${entryContent.trim()}`,
        // No cache_control — changes every keystroke
      })
    }

    const refineStream = anthropic.messages.stream({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 2048,   // entries can run longer than coach replies
      system:     systemBlocks,
      messages:   [
        ...history,
        { role: "user" as const, content: message },
      ],
    })

    const enc = new TextEncoder()
    const refineReadable = new ReadableStream({
      async start(controller) {
        try {
          refineStream.on("text", (text) => controller.enqueue(enc.encode(text)))
          await refineStream.finalMessage()
          controller.close()
        } catch (err) {
          const msg =
            err instanceof Error && err.message.toLowerCase().includes("credit")
              ? "[AI_ERROR: Your Anthropic account has insufficient credits. Please top up at console.anthropic.com/billing.]"
              : "[AI_ERROR: The AI service is temporarily unavailable. Please try again.]"
          controller.enqueue(enc.encode(msg))
          controller.close()
        }
      },
      cancel() { refineStream.abort() },
    })

    return new Response(refineReadable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    })
  }

  // Load server-side context: memories + session summaries + prefs (bio, style) + habits
  const todayIso = new Date().toISOString().slice(0, 10)

  const [memoriesRaw, summariesRaw, prefs, habitsRaw] = await Promise.all([
    prisma.memory.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take:    10,
      select:  { content: true },
    }),
    prisma.sessionSummary.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take:    5,
      select:  { summary: true },
    }),
    prisma.userPreferences.findUnique({
      where:  { userId: session.user.id },
      select: { userBio: true, coachStyle: true },
    }),
    // Fetch habits with ONLY today's log so the coach knows completion status
    prisma.habit.findMany({
      where:   { userId: session.user.id },
      orderBy: { order: "asc" },
      select:  {
        name: true,
        logs: {
          where:  { date: todayIso },
          select: { date: true },
        },
      },
    }),
  ])

  const memories         = memoriesRaw.map((m: { content: string }) => m.content)
  const sessionSummaries = summariesRaw.map((s: { summary: string }) => s.summary)
  const userBio          = prefs?.userBio    ?? null
  const coachStyle       = prefs?.coachStyle ?? "balanced"
  const habits           = habitsRaw as HabitForContext[]

  const contextBlock = buildContextBlock(
    coachContext, entryContent, recentEntries,
    memories, sessionSummaries, userBio, coachStyle, elevated, habits,
  )

  const systemBlocks: { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[] = [
    {
      type:          "text",
      text:          COACH_BASE_PROMPT,
      cache_control: { type: "ephemeral" },  // cached — stable rules
    },
  ]

  // Only add the context block if there's actual context to inject
  if (contextBlock.trim()) {
    systemBlocks.push({
      type: "text",
      text: contextBlock,
      // No cache_control — this changes per user and per session
    })
  }

  const stream = anthropic.messages.stream({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system:     systemBlocks,
    messages:   [
      ...history,
      { role: "user" as const, content: message },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        stream.on("text", (text) => {
          controller.enqueue(encoder.encode(text))
        })
        await stream.finalMessage()
        controller.close()
      } catch (err) {
        // Surface a meaningful error token so the client can display it
        const msg =
          err instanceof Error && err.message.toLowerCase().includes("credit")
            ? "[AI_ERROR: Your Anthropic account has insufficient credits. Please top up at console.anthropic.com/billing.]"
            : "[AI_ERROR: The AI service is temporarily unavailable. Please try again.]"
        controller.enqueue(encoder.encode(msg))
        controller.close()
      }
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type":  "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  })
}
