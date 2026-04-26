import { NextRequest, NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"
import { prisma } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "verify")
  if (limited) return limited

  const { email: rawEmail, code } = await req.json()
  const email = rawEmail?.trim().toLowerCase()

  if (!email || !code) {
    return NextResponse.json({ error: "Missing email or code" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Already verified — treat as success (idempotent)
  if (user?.emailVerified) {
    return NextResponse.json({ success: true })
  }

  if (!user || !user.verifyToken || !user.verifyTokenExp) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
  }

  if (new Date() > user.verifyTokenExp) {
    return NextResponse.json(
      { error: "Code expired — request a new one." },
      { status: 400 },
    )
  }

  // Constant-time comparison to prevent timing attacks
  const inputHash  = Buffer.from(createHash("sha256").update(String(code)).digest("hex"))
  const storedHash = Buffer.from(user.verifyToken)

  const match =
    inputHash.length === storedHash.length &&
    timingSafeEqual(inputHash, storedHash)

  if (!match) {
    return NextResponse.json(
      { error: "Incorrect code — check your email and try again." },
      { status: 400 },
    )
  }

  await prisma.user.update({
    where: { email },
    data:  { emailVerified: true, verifyToken: null, verifyTokenExp: null },
  })

  return NextResponse.json({ success: true })
}
