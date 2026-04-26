import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * GET /api/entries/[id]/chat
 * Returns the full chat history for an entry (ordered by createdAt asc).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const entry = await prisma.entry.findFirst({ where: { id, userId: session.user.id } })
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const messages = await prisma.chatMessage.findMany({
    where:   { entryId: id },
    orderBy: { createdAt: "asc" },
    select:  { id: true, role: true, content: true, createdAt: true },
  })

  return NextResponse.json({ messages })
}

/**
 * POST /api/entries/[id]/chat
 * Appends one or more messages to this entry's chat history.
 * Body: { messages: [{ role: "user" | "assistant", content: string }] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const entry = await prisma.entry.findFirst({ where: { id, userId: session.user.id } })
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { messages }: { messages: { role: string; content: string }[] } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 })
  }

  await prisma.chatMessage.createMany({
    data: messages.map((m) => ({
      userId:  session.user!.id!,
      entryId: id,
      role:    m.role,
      content: m.content,
    })),
  })

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/entries/[id]/chat
 * Clears the entire chat history for an entry.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const entry = await prisma.entry.findFirst({ where: { id, userId: session.user.id } })
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.chatMessage.deleteMany({ where: { entryId: id } })

  return NextResponse.json({ ok: true })
}
