import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/auth/check-verification?email=...
 *
 * Used by the login page after a failed sign-in attempt to determine whether
 * the failure is because the account exists but the email hasn't been verified
 * yet (rather than wrong credentials).
 *
 * Security notes:
 * - Only reveals "unverified" — never confirms whether a verified account exists
 * - Always returns 200 to avoid leaking information via status codes
 * - Intentionally not rate-limited here; the upstream signIn is already limited
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim()

  if (!email || !email.includes("@")) {
    return NextResponse.json({ unverified: false })
  }

  const user = await prisma.user.findUnique({
    where:  { email },
    select: { emailVerified: true },
  })

  // Only expose "unverified" — everything else looks the same to the caller
  const unverified = user !== null && user.emailVerified === false

  return NextResponse.json({ unverified })
}
