import { NextRequest, NextResponse } from "next/server"
import { createHash, randomInt } from "crypto"
import { prisma } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"

const RESEND_COOLDOWN_SECONDS = 60

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "resend")
  if (limited) return limited

  const { email: rawEmail } = await req.json()
  const email = rawEmail?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Don't reveal whether the email exists
  if (!user || user.emailVerified) {
    return NextResponse.json({ success: true })
  }

  // Rate-limit: infer sent-at from (verifyTokenExp − 15 min)
  if (user.verifyTokenExp) {
    const sentAt = new Date(user.verifyTokenExp.getTime() - 15 * 60 * 1000)
    const secondsSinceSent = (Date.now() - sentAt.getTime()) / 1000
    if (secondsSinceSent < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceSent)
      return NextResponse.json(
        { error: `Please wait ${wait}s before requesting a new code.`, wait },
        { status: 429 },
      )
    }
  }

  const code = String(randomInt(100000, 1000000))
  const hash = createHash("sha256").update(code).digest("hex")
  const exp  = new Date(Date.now() + 15 * 60 * 1000)

  await prisma.user.update({
    where: { email },
    data:  { verifyToken: hash, verifyTokenExp: exp },
  })

  try {
    await sendVerificationEmail(email, code)
  } catch {
    return NextResponse.json(
      { error: "Failed to send email — please try again later." },
      { status: 503 },
    )
  }

  return NextResponse.json({ success: true })
}
