import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * POST /api/user/migrate-keys
 *
 * One-time migration from per-entry password derivation to envelope encryption.
 * The client:
 *   1. Generates a random MEK
 *   2. Decrypts every existing entry with the old password-derived key
 *   3. Re-encrypts each entry with the MEK
 *   4. Wraps the MEK with a KEK derived from the password
 *   5. Sends everything here in one atomic transaction
 *
 * Body: { encryptedMek, mekIv, kekSalt, entries: [{ id, ciphertext, iv }] }
 *
 * The transaction guarantees all-or-nothing — if it fails, the old scheme
 * is still intact and the client can retry.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { encryptedMek, mekIv, kekSalt, entries } = body

  if (!encryptedMek || !mekIv || !kekSalt || !Array.isArray(entries)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Validate every entry id belongs to this user before entering the transaction
  const entryIds = entries.map((e: { id: string }) => e.id)
  if (entryIds.length > 0) {
    const owned = await prisma.entry.findMany({
      where:  { id: { in: entryIds }, userId: session.user.id },
      select: { id: true },
    })
    if (owned.length !== entryIds.length) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  await prisma.$transaction([
    // Store the key bundle on the user record
    prisma.user.update({
      where: { id: session.user.id },
      data:  { encryptedMek, mekIv, kekSalt },
    }),
    // Re-encrypted entries: ciphertext + iv updated, salt cleared (null = MEK-encrypted)
    ...entries.map(({ id, ciphertext, iv }: { id: string; ciphertext: string; iv: string }) =>
      prisma.entry.update({
        where: { id },
        data:  { ciphertext, iv, salt: null },
      }),
    ),
  ])

  return NextResponse.json({ ok: true })
}
