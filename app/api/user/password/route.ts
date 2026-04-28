import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { validatePasswordServer } from "@/lib/password-strength"

/**
 * PUT /api/user/password
 *
 * Change the user's password.  Because entries are encrypted with a MEK
 * (Master Encryption Key) that is only *wrapped* by a KEK derived from the
 * password, changing the password only requires re-wrapping the tiny MEK
 * blob — journal entries themselves are never touched.
 *
 * Security:
 *   • currentPassword is verified against the stored bcrypt hash before any
 *     changes are made.
 *   • The new key bundle (encryptedMek, mekIv, kekSalt) is produced
 *     client-side: the server only ever sees wrapped key material.
 *   • The update is atomic — either both the password hash AND key bundle
 *     change, or neither does.
 *
 * Body: { currentPassword, newPassword, encryptedMek, mekIv, kekSalt }
 */
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { currentPassword, newPassword, encryptedMek, mekIv, kekSalt } = await req.json()

  if (!currentPassword || !newPassword || !encryptedMek || !mekIv || !kekSalt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const pwError = validatePasswordServer(newPassword)
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Verify the current password before making any changes
  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
  }

  const newHash = await bcrypt.hash(newPassword, 12)

  // Atomically update password hash + re-wrapped key bundle
  await prisma.user.update({
    where: { id: session.user.id },
    data:  { passwordHash: newHash, encryptedMek, mekIv, kekSalt },
  })

  return NextResponse.json({ ok: true })
}
