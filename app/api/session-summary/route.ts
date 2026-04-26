import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { anthropic } from "@/lib/ai/claude"
import { SESSION_SUMMARY_PROMPT } from "@/lib/ai/prompts"

interface HistoryMessage {
  role:    "user" | "assistant"
  content: string
}

/**
 * POST /api/session-summary
 * Generates and persists a brief summary of a coach conversation.
 * Called fire-and-forget when the user closes the coach panel.
 *
 * Body: { messages: HistoryMessage[], entryId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const {
    messages,
    entryId,
  }: { messages: HistoryMessage[]; entryId?: string } = await req.json()

  // Require at least one exchange (user + assistant)
  if (!Array.isArray(messages) || messages.length < 2) {
    return NextResponse.json({ ok: true })  // no-op — too short to summarise
  }

  // Format the conversation for the summariser
  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`)
    .join("\n")

  try {
    const response = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:     SESSION_SUMMARY_PROMPT,
      messages:   [{ role: "user", content: transcript }],
    })

    const summary =
      response.content[0].type === "text" ? response.content[0].text.trim() : ""

    if (summary) {
      // Cap at 100 summaries per user — remove oldest if needed
      const count = await prisma.sessionSummary.count({ where: { userId: session.user.id } })
      if (count >= 100) {
        const oldest = await prisma.sessionSummary.findFirst({
          where:   { userId: session.user.id },
          orderBy: { createdAt: "asc" },
        })
        if (oldest) await prisma.sessionSummary.delete({ where: { id: oldest.id } })
      }

      await prisma.sessionSummary.create({
        data: {
          userId:  session.user.id,
          entryId: entryId ?? null,
          summary,
        },
      })
    }
  } catch {
    // Non-fatal — summaries are best-effort
  }

  return NextResponse.json({ ok: true })
}

/**
 * GET /api/session-summary
 * Returns the N most recent session summaries (default 5) for context injection.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url   = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "5", 10), 20)

  const summaries = await prisma.sessionSummary.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take:    limit,
    select:  { id: true, summary: true, entryId: true, createdAt: true },
  })

  return NextResponse.json({ summaries })
}
