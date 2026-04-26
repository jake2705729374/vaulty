import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * GET /api/memories
 * Returns all memories for the authenticated user (newest first).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const memories = await prisma.memory.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select:  { id: true, content: true, source: true, createdAt: true },
  })

  return NextResponse.json({ memories })
}

/**
 * POST /api/memories
 * Saves a new memory.
 * Body: { content: string, source?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content, source = "coach" }: { content: string; source?: string } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 })

  // Cap at 500 memories per user
  const count = await prisma.memory.count({ where: { userId: session.user.id } })
  if (count >= 500) {
    // Remove the oldest to make room
    const oldest = await prisma.memory.findFirst({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    })
    if (oldest) await prisma.memory.delete({ where: { id: oldest.id } })
  }

  const memory = await prisma.memory.create({
    data: { userId: session.user.id, content: content.trim(), source },
  })

  return NextResponse.json({ memory }, { status: 201 })
}
