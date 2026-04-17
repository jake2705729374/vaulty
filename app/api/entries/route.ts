import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      moodLog: { select: { mood: true } },
    },
  })

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      title: e.title,
      createdAt: e.createdAt.toISOString(),
      mood: e.moodLog?.mood ?? null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { title, ciphertext, iv, salt, mood } = await req.json()
  if (!ciphertext || !iv || !salt) {
    return NextResponse.json({ error: "Missing encrypted content" }, { status: 400 })
  }

  const entry = await prisma.entry.create({
    data: {
      userId: session.user.id,
      title: title ?? "Untitled",
      ciphertext,
      iv,
      salt,
      ...(mood && {
        moodLog: {
          create: { userId: session.user.id, mood },
        },
      }),
    },
  })

  return NextResponse.json({ id: entry.id, createdAt: entry.createdAt.toISOString() }, { status: 201 })
}
