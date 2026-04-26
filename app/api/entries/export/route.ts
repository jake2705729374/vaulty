import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Returns all entries with ciphertext so the client can decrypt and download
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const entries = await prisma.entry.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id:         true,
      title:      true,
      ciphertext: true,
      iv:         true,
      salt:       true,
      createdAt:  true,
      updatedAt:  true,
      moodLog:    { select: { mood: true } },
    },
  })

  return NextResponse.json({
    entries: entries.map((e: (typeof entries)[number]) => ({
      id:         e.id,
      title:      e.title,
      ciphertext: e.ciphertext,
      iv:         e.iv,
      salt:       e.salt,
      createdAt:  e.createdAt.toISOString(),
      updatedAt:  e.updatedAt.toISOString(),
      mood:       e.moodLog?.mood ?? null,
    })),
  })
}
