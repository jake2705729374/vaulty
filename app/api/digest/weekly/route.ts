import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { anthropic } from "@/lib/ai/claude"
import { DIGEST_SYSTEM_PROMPT } from "@/lib/ai/prompts"
import { sendWeeklyDigest } from "@/lib/email"

/**
 * GET /api/digest/weekly
 *
 * Two callers:
 *   1. Vercel Cron (daily at 09:00 UTC) — identified by
 *      Authorization: Bearer <CRON_SECRET>.  Processes ALL opted-in users.
 *   2. Client-side dashboard load — authenticated via NextAuth session.
 *      Processes only the current user.  Safe to call frequently; the route
 *      no-ops if the last digest was sent < 6 days ago.
 */
export async function GET(req: NextRequest) {
  // ── Vercel Cron path ─────────────────────────────────────────────────────
  // Vercel sends  Authorization: Bearer <CRON_SECRET>  on scheduled invocations.
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return handleCronDigest()
  }

  // ── Authenticated user path ──────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  return handleUserDigest(session.user.id, session.user.email ?? "")
}

async function handleUserDigest(userId: string, email: string) {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } })
  if (!prefs?.digestEnabled) return NextResponse.json({ skipped: "disabled" })

  // Throttle: don't send more than once every 6 days
  if (prefs.lastDigestAt) {
    const daysSince = (Date.now() - prefs.lastDigestAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 6) return NextResponse.json({ skipped: "too_soon" })
  }

  await generateAndSendDigest(userId, email, prefs.displayName)
  return NextResponse.json({ ok: true })
}

async function handleCronDigest() {
  const users = await prisma.userPreferences.findMany({
    where: { digestEnabled: true },
    include: { user: { select: { email: true } } },
  })

  let sent = 0
  for (const prefs of users) {
    const daysSince = prefs.lastDigestAt
      ? (Date.now() - prefs.lastDigestAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999
    if (daysSince < 6) continue

    try {
      await generateAndSendDigest(prefs.userId, prefs.user.email, prefs.displayName)
      sent++
    } catch {
      // Non-fatal — continue to next user
    }
  }

  return NextResponse.json({ sent })
}

async function generateAndSendDigest(
  userId: string,
  email: string,
  displayName: string | null,
) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Gather data — titles + moods only (body is encrypted)
  const entries = await prisma.entry.findMany({
    where:   { userId, createdAt: { gte: weekAgo } },
    orderBy: { createdAt: "asc" },
    select:  { title: true, createdAt: true, moodLog: { select: { mood: true } } },
  })

  const memories = await prisma.memory.findMany({
    where:   { userId, createdAt: { gte: weekAgo } },
    orderBy: { createdAt: "desc" },
    take:    5,
    select:  { content: true },
  })

  const summaries = await prisma.sessionSummary.findMany({
    where:   { userId, createdAt: { gte: weekAgo } },
    orderBy: { createdAt: "desc" },
    take:    5,
    select:  { summary: true },
  })

  if (entries.length === 0 && memories.length === 0) {
    // Nothing to digest this week
    return
  }

  // Build the digest input for Claude
  const entryLines = entries.map((e: { title: string; createdAt: Date; moodLog: { mood: string } | null }) => {
    const date = e.createdAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    const mood = e.moodLog?.mood ?? ""
    return `- ${date}: "${e.title}"${mood ? ` (${mood.toLowerCase()})` : ""}`
  })

  const parts: string[] = []
  if (entryLines.length) parts.push(`Entries this week:\n${entryLines.join("\n")}`)
  if (memories.length)   parts.push(`Insights saved this week:\n${memories.map((m: { content: string }) => `- ${m.content}`).join("\n")}`)
  if (summaries.length)  parts.push(`Coach session notes:\n${summaries.map((s: { summary: string }) => `- ${s.summary}`).join("\n")}`)

  const digestInput = parts.join("\n\n")

  const response = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system:     DIGEST_SYSTEM_PROMPT,
    messages:   [{ role: "user", content: digestInput }],
  })

  const digestText =
    response.content[0].type === "text" ? response.content[0].text.trim() : ""

  if (digestText) {
    const name = displayName ?? email.split("@")[0]
    await sendWeeklyDigest({ to: email, name, digest: digestText, entryCount: entries.length })
  }

  // Update lastDigestAt
  await prisma.userPreferences.update({
    where: { userId },
    data:  { lastDigestAt: new Date() },
  })
}
