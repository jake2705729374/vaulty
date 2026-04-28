import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/coach/sessions — list all sessions for the current user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await prisma.coachSession.findMany({
    where:   { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id:        true,
      title:     true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take:    1,
        select:  { content: true, role: true },
      },
    },
  })

  const result = rows.map((r) => ({
    id:        r.id,
    title:     r.title,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    preview:   r.messages[0]?.content.slice(0, 80) ?? "",
    lastRole:  r.messages[0]?.role ?? "assistant",
  }))

  return NextResponse.json(result)
}

// POST /api/coach/sessions — create a new session
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { title = "New conversation" } = await req.json().catch(() => ({}))

  const row = await prisma.coachSession.create({
    data: { userId: session.user.id, title: String(title).slice(0, 120) },
  })

  return NextResponse.json({ id: row.id, title: row.title, createdAt: row.createdAt })
}
