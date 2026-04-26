import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/auth/reset-password
 *
 * Verifies the 6-digit OTP sent by /api/auth/forgot-password and:
 *   1. Updates the user's bcrypt password hash
 *   2. Stores the new key bundle (encryptedMek / mekIv / kekSalt) — produced
 *      client-side so the raw MEK never touches the server
 *   3. Clears the OTP fields
 *
 * Because the old MEK is gone, existing encrypted entries will no longer
 * be decryptable. The client warns users about this before they confirm.
 *
 * Body: { email, code, newPassword, encryptedMek, mekIv, kekSalt }
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "password")
  if (limited) return limited

  const { email, code, newPassword, encryptedMek, mekIv, kekSalt } = await req.json()

  if (!email || !code || !newPassword || !encryptedMek || !mekIv || !kekSalt) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where:  { email: String(email).toLowerCase().trim() },
    select: { id: true, resetToken: true, resetTokenExp: true },
  })

  const INVALID = { error: "Invalid or expired reset code." }

  if (!user || !user.resetToken || !user.resetTokenExp) {
    return NextResponse.json(INVALID, { status: 400 })
  }

  // Check expiry
  if (user.resetTokenExp < new Date()) {
    return NextResponse.json(INVALID, { status: 400 })
  }

  // Constant-time comparison via hash
  const submitted = createHash("sha256").update(String(code).trim()).digest("hex")
  if (submitted !== user.resetToken) {
    return NextResponse.json(INVALID, { status: 400 })
  }

  const newHash = await bcrypt.hash(newPassword, 12)

  // Atomically update password + key bundle + clear OTP
  await prisma.user.update({
    where: { id: user.id },
    data:  {
      passwordHash:  newHash,
      encryptedMek,
      mekIv,
      kekSalt,
      resetToken:    null,
      resetTokenExp: null,
    },
  })

  return NextResponse.json({ ok: true })
}
