import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { HabitBodySchema, MAX_BODY_BYTES, parseBody } from "@/lib/validation"

const MAX_HABITS = 10

// GET /api/habits — list all habits with their logs for the past 90 days
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const since = ninetyDaysAgo.toISOString().slice(0, 10)

  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
    include: {
      logs: {
        where: { date: { gte: since } },
        orderBy: { date: "asc" },
        select: { id: true, date: true },
      },
    },
  })

  return NextResponse.json({ habits })
}

// POST /api/habits — create a new habit (max 10)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const count = await prisma.habit.count({ where: { userId: session.user.id } })
  if (count >= MAX_HABITS) {
    return NextResponse.json({ error: `Maximum of ${MAX_HABITS} habits allowed` }, { status: 422 })
  }

  const parsed = parseBody(await req.text(), HabitBodySchema, MAX_BODY_BYTES)
  if (parsed.error) return parsed.error

  const COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#06b6d4","#84cc16","#f97316"]
  const { name, description = null, color = COLORS[count % COLORS.length] } = parsed.data

  const habit = await prisma.habit.create({
    data: { userId: session.user.id, name, description: description ?? null, color, order: count },
    include: { logs: { select: { id: true, date: true } } },
  })

  return NextResponse.json({ habit }, { status: 201 })
}
