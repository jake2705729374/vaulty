import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { anthropic } from "@/lib/ai/claude"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST /api/coach/sessions/[id]/generate-title
 *
 * Generates a short, descriptive title for a coach session using the first
 * 6 messages as context.  Called fire-and-forget from the client after the
 * 4th message (2nd full exchange), when there's enough context to name the
 * conversation meaningfully.
 *
 * Uses claude-haiku for speed; max_tokens: 25 keeps it cheap (~$0.000015/call).
 * Returns { title } on success.  If the session already has a custom title
 * (i.e. the user manually renamed it) the route still runs — caller can decide
 * whether to apply the result.
 */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Load the session + first 6 messages
  const row = await prisma.coachSession.findFirst({
    where:  { id, userId: session.user.id },
    select: {
      title: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take:    6,
        select:  { role: true, content: true },
      },
    },
  })

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (row.messages.length < 4) {
    return NextResponse.json({ skipped: "not_enough_messages" })
  }

  // Build a compact transcript for the titling prompt
  const transcript = row.messages
    .map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content.slice(0, 200)}`)
    .join("\n")

  let title: string

  try {
    const response = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 25,
      system: `You generate short, specific titles for journal coaching conversations.
Rules:
- 4 to 7 words
- Specific to what was actually discussed — not generic
- Sentence case, no quotes, no trailing punctuation
- Examples: "Processing anxiety around job change", "Reflecting on family dinner tension", "Working through fear of failure"
Reply with the title only. Nothing else.`,
      messages: [
        {
          role:    "user",
          content: `Here is the conversation:\n\n${transcript}\n\nTitle:`,
        },
      ],
    })

    const raw = response.content[0]?.type === "text"
      ? response.content[0].text.trim()
      : ""

    // Sanitise: strip quotes, limit length
    title = raw.replace(/^["']|["']$/g, "").slice(0, 100) || row.title
  } catch {
    // Non-fatal — keep the existing title
    return NextResponse.json({ skipped: "ai_error" })
  }

  // Persist the new title
  await prisma.coachSession.update({
    where: { id },
    data:  { title },
  })

  return NextResponse.json({ title })
}
