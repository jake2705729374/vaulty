import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/habits/[id] — update name / description / color
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const habit = await prisma.habit.findFirst({ where: { id, userId: session.user.id } })
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
  if ("description" in body) {
    data.description = typeof body.description === "string" && body.description.trim()
      ? body.description.trim() : null
  }
  if (typeof body.color === "string") data.color = body.color

  const updated = await prisma.habit.update({
    where: { id },
    data,
    include: { logs: { select: { id: true, date: true } } },
  })

  return NextResponse.json({ habit: updated })
}

// DELETE /api/habits/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const habit = await prisma.habit.findFirst({ where: { id, userId: session.user.id } })
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.habit.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
