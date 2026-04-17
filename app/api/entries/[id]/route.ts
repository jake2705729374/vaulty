import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const entry = await prisma.entry.findFirst({
    where: { id, userId: session.user.id },
    include: { moodLog: { select: { mood: true } } },
  })

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: entry.id,
    title: entry.title,
    ciphertext: entry.ciphertext,
    iv: entry.iv,
    salt: entry.salt,
    createdAt: entry.createdAt.toISOString(),
    mood: entry.moodLog?.mood ?? null,
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.entry.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { title, ciphertext, iv, salt, mood } = await req.json()
  if (!ciphertext || !iv || !salt) {
    return NextResponse.json({ error: "Missing encrypted content" }, { status: 400 })
  }

  const entry = await prisma.entry.update({
    where: { id },
    data: {
      title: title ?? "Untitled",
      ciphertext,
      iv,
      salt,
    },
  })

  // Upsert mood log
  if (mood) {
    await prisma.moodLog.upsert({
      where: { entryId: id },
      create: { userId: session.user.id, entryId: id, mood },
      update: { mood },
    })
  } else {
    await prisma.moodLog.deleteMany({ where: { entryId: id } })
  }

  return NextResponse.json({ id: entry.id, updatedAt: entry.updatedAt.toISOString() })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const entry = await prisma.entry.findFirst({ where: { id, userId: session.user.id } })
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.entry.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
