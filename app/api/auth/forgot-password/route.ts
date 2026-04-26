import { NextRequest, NextResponse } from "next/server"
import { createHash, randomInt } from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/auth/forgot-password
 *
 * Generates a 6-digit OTP, stores its SHA-256 hash (15-min expiry) on the
 * user record, and sends the code to the user's email address.
 *
 * Works for both authenticated users (session found → email inferred) and
 * unauthenticated users (email supplied in request body).
 *
 * Always returns 200 even when no user is found (avoids leaking which
 * email addresses are registered).
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "password")
  if (limited) return limited

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email service is not configured. Contact the app administrator." },
      { status: 503 },
    )
  }

  let email: string | null = null

  // Prefer the authenticated session email (can't be spoofed)
  const session = await auth()
  if (session?.user?.email) {
    email = session.user.email
  } else {
    const body = await req.json().catch(() => ({}))
    if (typeof body.email === "string" && body.email.includes("@")) {
      email = body.email.toLowerCase().trim()
    }
  }

  if (!email) {
    return NextResponse.json({ error: "Email address is required." }, { status: 400 })
  }

  // Always respond 200 to avoid leaking whether an address is registered
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ ok: true })

  const code    = String(randomInt(100_000, 1_000_000))
  const hash    = createHash("sha256").update(code).digest("hex")
  const expires = new Date(Date.now() + 15 * 60 * 1_000)

  await prisma.user.update({
    where: { id: user.id },
    data:  { resetToken: hash, resetTokenExp: expires },
  })

  try {
    await sendPasswordResetEmail(email, code)
  } catch {
    // Don't expose internal errors — log server-side only
    console.error("[forgot-password] Failed to send reset email to", email)
  }

  return NextResponse.json({ ok: true })
}
