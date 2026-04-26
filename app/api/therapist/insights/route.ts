import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { anthropic } from "@/lib/ai/claude"
import { INSIGHTS_SYSTEM_PROMPT } from "@/lib/ai/prompts"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const moodLogs = await prisma.moodLog.findMany({
    where: { userId: session.user.id },
    orderBy: { loggedAt: "desc" },
    take: 90,
    select: { mood: true, loggedAt: true },
  })

  if (moodLogs.length < 3) {
    return NextResponse.json({
      summary: "You need at least a few mood entries before I can spot patterns. Keep journaling!",
      dominantMood: null,
      trend: "insufficient_data",
    })
  }

  // Build a compact text summary for Claude
  const moodSummary = moodLogs
    .map((l: (typeof moodLogs)[number]) => `${new Date(l.loggedAt).toLocaleDateString()} — ${l.mood}`)
    .join("\n")

  const moodCounts: Record<string, number> = moodLogs.reduce(
    (acc: Record<string, number>, l: (typeof moodLogs)[number]) => {
      acc[l.mood] = (acc[l.mood] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const dominantMood =
    (Object.entries(moodCounts) as [string, number][])
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 400,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: INSIGHTS_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Here is the mood log (most recent first, last ${moodLogs.length} entries):\n\n${moodSummary}\n\nMood counts: ${JSON.stringify(moodCounts)}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === "text")
  const summary = textBlock?.type === "text" ? textBlock.text : ""

  // Simple trend: compare first vs last third of entries
  const third = Math.floor(moodLogs.length / 3)
  const MOOD_SCORE: Record<string, number> = { GREAT: 5, GOOD: 4, OKAY: 3, LOW: 2, AWFUL: 1 }
  const recentAvg =
    moodLogs.slice(0, third).reduce((s: number, l: (typeof moodLogs)[number]) => s + (MOOD_SCORE[l.mood] ?? 3), 0) / third
  const olderAvg =
    moodLogs.slice(-third).reduce((s: number, l: (typeof moodLogs)[number]) => s + (MOOD_SCORE[l.mood] ?? 3), 0) / third
  const trend = recentAvg > olderAvg + 0.5 ? "improving" : recentAvg < olderAvg - 0.5 ? "declining" : "stable"

  return NextResponse.json({ summary, dominantMood, trend })
}
