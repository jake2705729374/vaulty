import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { createHash, randomInt } from "crypto"
import { prisma } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"
import { validatePasswordServer } from "@/lib/password-strength"

function generateCode(): { code: string; hash: string; exp: Date } {
  const code = String(randomInt(100000, 1000000))
  const hash = createHash("sha256").update(code).digest("hex")
  const exp  = new Date(Date.now() + 15 * 60 * 1000)
  return { code, hash, exp }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "register")
  if (limited) return limited

  const { email: rawEmail, password } = await req.json()
  const email = rawEmail?.trim().toLowerCase()

  if (!email || !password) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const pwError = validatePasswordServer(password)
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    if (!existing.emailVerified) {
      // Account exists but was never verified — resend a fresh code
      const { code, hash, exp } = generateCode()
      await prisma.user.update({
        where: { email },
        data:  { verifyToken: hash, verifyTokenExp: exp },
      })
      try {
        await sendVerificationEmail(email, code)
      } catch {
        return NextResponse.json(
          { error: "Could not send verification email. Check your SMTP settings." },
          { status: 503 },
        )
      }
      return NextResponse.json({ pending: true }, { status: 200 })
    }
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  // Create the account in an unverified state
  const passwordHash = await bcrypt.hash(password, 12)
  const { code, hash, exp } = generateCode()

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerified:  false,
      verifyToken:    hash,
      verifyTokenExp: exp,
    },
  })

  await prisma.userPreferences.create({ data: { userId: user.id } })

  // Attempt to send the verification email — roll back if it fails
  try {
    await sendVerificationEmail(email, code)
  } catch {
    await prisma.user.delete({ where: { id: user.id } })
    return NextResponse.json(
      { error: "Could not send verification email. Check your SMTP settings." },
      { status: 503 },
    )
  }

  return NextResponse.json({ pending: true }, { status: 201 })
}
