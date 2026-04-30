import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
    include: {
      logs: {
        where: { date: { gte: since } },
        orderBy: { date: "asc" },
        select: { date: true },
      },
    },
  })

  if (habits.length === 0) {
    return NextResponse.json({ insight: "Add some habits to track first, then come back for insights!" })
  }

  // Build a summary for Claude
  const habitSummaries = habits.map((h) => {
    const totalDays = 30
    const completedDays = h.logs.length
    const rate = Math.round((completedDays / totalDays) * 100)
    // Compute current streak
    let streak = 0
    const d = new Date()
    while (true) {
      const ds = d.toISOString().slice(0, 10)
      if (h.logs.some((l) => l.date === ds)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return `- "${h.name}"${h.description ? ` (goal: ${h.description})` : ""}: ${completedDays}/${totalDays} days (${rate}%), current streak: ${streak} days`
  }).join("\n")

  const prompt = `You are a supportive habit coach. Here is a user's habit tracking data for the past 30 days (today is ${today}):\n\n${habitSummaries}\n\nProvide 3-4 sentences of warm, specific, actionable insight. Acknowledge what's going well, notice any patterns, and offer one concrete suggestion. Be encouraging but honest. Don't use bullet points — write in natural paragraphs.`

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  })

  const insight = message.content[0].type === "text" ? message.content[0].text : ""
  return NextResponse.json({ insight })
}
