import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

/**
 * DELETE /api/user
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * All related records (entries, coach sessions, habits, memories, etc.) are
 * removed via Prisma's onDelete: Cascade — no orphaned rows remain.
 *
 * Security: the user must supply their current password, which is verified
 * against the stored bcrypt hash before any deletion occurs.
 *
 * Body: { password: string }
 */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { password } = await req.json().catch(() => ({}))

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, passwordHash: true },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 })
  }

  // Cascade deletes all: Entry, MoodLog, EntryMedia, ChatMessage, Memory,
  // SessionSummary, Habit, HabitLog, CoachSession, CoachSessionMessage,
  // UserPreferences, Session — all have onDelete: Cascade on the User relation.
  await prisma.user.delete({ where: { id: user.id } })

  return NextResponse.json({ ok: true })
}
