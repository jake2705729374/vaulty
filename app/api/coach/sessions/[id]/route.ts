import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/coach/sessions/[id] — load messages for a session
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const row = await prisma.coachSession.findFirst({
    where:  { id, userId: session.user.id },
    select: {
      id:    true,
      title: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select:  { role: true, content: true, createdAt: true },
      },
    },
  })

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(row)
}

// PATCH /api/coach/sessions/[id] — rename a session
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { title } = await req.json().catch(() => ({}))

  const row = await prisma.coachSession.updateMany({
    where: { id, userId: session.user.id },
    data:  { title: String(title ?? "").slice(0, 120) || "New conversation" },
  })

  return NextResponse.json({ updated: row.count })
}

// DELETE /api/coach/sessions/[id] — delete a session
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  await prisma.coachSession.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
