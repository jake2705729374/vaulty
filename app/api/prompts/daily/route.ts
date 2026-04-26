import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { pickDailyPrompt } from "@/lib/prompts/journaling"

/**
 * GET /api/prompts/daily
 * Returns today's journaling prompt, personalised to the user's context.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const prefs = await prisma.userPreferences.findUnique({
    where:  { userId: session.user.id },
    select: {
      journalingGoals: true,
      coachPeople:     true,
      coachLifeContext: true,
    },
  })

  // Last 7 mood logs for trend awareness
  const recentMoods = await prisma.moodLog.findMany({
    where:   { userId: session.user.id },
    orderBy: { loggedAt: "desc" },
    take:    7,
    select:  { mood: true },
  })

  const goals: string[]     = prefs?.journalingGoals     ? JSON.parse(prefs.journalingGoals)     : []
  const lifeCtx             = prefs?.coachLifeContext     ? JSON.parse(prefs.coachLifeContext)    : {}
  const situations: string[]= lifeCtx.situations ?? []
  const moods: string[]     = recentMoods.map((m: { mood: string }) => m.mood)

  const skip   = parseInt(req.nextUrl.searchParams.get("skip") ?? "0")
  const prompt = pickDailyPrompt({ goals, situations, moods }, skip)

  return NextResponse.json({ prompt })
}
