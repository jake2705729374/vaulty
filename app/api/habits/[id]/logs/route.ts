import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

// POST /api/habits/[id]/logs — toggle completion for a date
// Body: { date: "YYYY-MM-DD" }
// If a log exists for that date → delete it (uncomplete). Otherwise → create it (complete).
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: habitId } = await params
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: session.user.id },
    select: { id: true },
  })
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const date: string = typeof body.date === "string" ? body.date : ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 })
  }

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date } },
  })

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
    return NextResponse.json({ completed: false, date })
  } else {
    await prisma.habitLog.create({ data: { habitId, userId: session.user.id, date } })
    return NextResponse.json({ completed: true, date })
  }
}
