import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { anthropic } from "@/lib/ai/claude"

/**
 * POST /api/coach/extract
 *
 * Structured extraction from a completed coaching exchange.
 * Called fire-and-forget after streaming finishes — never blocks the UI.
 *
 * Extracts:
 * - themes:            1-3 key topics/emotional themes (for future retrieval context)
 * - memory_candidates: 0-2 durable facts worth remembering across sessions
 *   (e.g. "User's sister Sarah is getting married in June")
 *
 * memory_candidates are saved directly to the Memory table here — so CoachPanel
 * no longer needs to call /api/memories with raw assistant text.
 *
 * Body:    { userMessage: string, assistantResponse: string }
 * Returns: { themes: string[], memory_candidates: string[] }
 */

export async function POST(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const userMessage:       string = body.userMessage       ?? ""
  const assistantResponse: string = body.assistantResponse ?? ""

  if (!userMessage.trim() || !assistantResponse.trim()) {
    return NextResponse.json({ themes: [], memory_candidates: [] })
  }

  try {
    const result = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:     `You extract structured information from a single coaching conversation exchange.

Given the user's message and the coach's response, extract:
1. themes: 1-3 key topics or emotional themes as short phrases (e.g. "work stress", "relationship anxiety", "self-confidence")
2. memory_candidates: 0-2 specific, durable facts worth remembering for future sessions.
   Good examples: "User mentioned their sister Sarah is getting married in June"
   "User is applying for a promotion at work"
   "User's dog Max recently passed away"
   Bad examples (too vague/emotional): "User felt stressed", "User was happy today"
   Only include concrete facts — not emotional states or opinions.

Return ONLY valid JSON with no other text: {"themes": ["..."], "memory_candidates": ["..."]}
If there are no memory candidates, return an empty array.`,
      messages: [{
        role:    "user",
        content: `User: ${userMessage}\n\nCoach: ${assistantResponse}`,
      }],
    })

    const text      = (result.content[0] as { type: "text"; text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return NextResponse.json({ themes: [], memory_candidates: [] })
    }

    const extracted: { themes?: string[]; memory_candidates?: string[] } = JSON.parse(jsonMatch[0])

    const themes            = Array.isArray(extracted.themes)            ? extracted.themes            : []
    const memory_candidates = Array.isArray(extracted.memory_candidates) ? extracted.memory_candidates : []

    // Persist each memory candidate — errors are non-fatal
    if (memory_candidates.length > 0) {
      await Promise.allSettled(
        memory_candidates
          .filter((c) => typeof c === "string" && c.trim().length > 0)
          .map((content) =>
            prisma.memory.create({
              data: {
                userId:  userId,
                content: content.trim(),
                source:  "coach_extract",
              },
            }),
          ),
      )
    }

    return NextResponse.json({ themes, memory_candidates })
  } catch {
    // Non-fatal — client never waits for this response anyway
    return NextResponse.json({ themes: [], memory_candidates: [] })
  }
}
