import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

// POST /api/coach/sessions/[id]/messages — append a message
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { role, content } = await req.json().catch(() => ({}))

  if (!role || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  // Verify ownership
  const owner = await prisma.coachSession.findFirst({
    where:  { id, userId: session.user.id },
    select: { id: true },
  })
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const msg = await prisma.coachSessionMessage.create({
    data: { sessionId: id, role: String(role), content: String(content) },
  })

  // Touch the session's updatedAt so it bubbles to top of list
  await prisma.coachSession.update({
    where: { id },
    data:  { updatedAt: new Date() },
  })

  return NextResponse.json({ id: msg.id })
}
