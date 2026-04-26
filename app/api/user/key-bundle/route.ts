import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * GET /api/user/key-bundle
 * Returns the user's envelope-encryption key bundle, or null if not yet set up.
 * The client uses this to unwrap the MEK using the user's password (PBKDF2 + AES-GCM).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { encryptedMek: true, mekIv: true, kekSalt: true },
  })

  if (!user?.encryptedMek || !user.mekIv || !user.kekSalt) {
    return NextResponse.json(null)   // no bundle yet — client will run migration
  }

  return NextResponse.json({
    encryptedMek: user.encryptedMek,
    mekIv:        user.mekIv,
    kekSalt:      user.kekSalt,
  })
}
