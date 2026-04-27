/**
 * Edge-compatible middleware — NO NextAuth imports.
 *
 * NextAuth v5's internal `jwtDecrypt` throws `AggregateError` when the token
 * is missing or malformed (e.g., during sign-out while cookies are being
 * cleared). That uncaught exception propagates out of the Edge Runtime and
 * produces Vercel's MIDDLEWARE_INVOCATION_FAILED / 500 error.
 *
 * Fix: bypass NextAuth entirely. Decode the session token ourselves using the
 * same algorithm NextAuth v5 uses internally:
 *   HKDF-SHA256(secret, salt=cookieName) → 64-byte key → jwtDecrypt (JWE)
 *
 * All JWT errors are caught and treated as "unauthenticated", so the
 * middleware NEVER throws — it always returns a valid Response.
 */
import { NextRequest, NextResponse } from "next/server"
import { hkdf } from "@panva/hkdf"
import { jwtDecrypt } from "jose"

// ── Protected-path list (same as the old authConfig.authorized callback) ────
const PROTECTED = [
  "/dashboard",
  "/journal",
  "/therapist",
  "/settings",
  "/coach",
  "/habits",
  "/onboarding",
]

// ── Possible NextAuth v5 session-cookie names (HTTPS first) ─────────────────
const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",   // NextAuth v5 production (HTTPS)
  "authjs.session-token",            // NextAuth v5 development (HTTP)
  "__Secure-next-auth.session-token",// NextAuth v4 production
  "next-auth.session-token",         // NextAuth v4 development
]

/** Derive the 64-byte JWE encryption key the same way NextAuth v5 does. */
async function deriveKey(secret: string, salt: string): Promise<Uint8Array> {
  return hkdf(
    "sha256",
    secret,
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    64
  )
}

/** Return true if `token` is a valid, non-expired NextAuth session JWT. */
async function isValidToken(token: string, secret: string): Promise<boolean> {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    try {
      const key = await deriveKey(secret, cookieName)
      await jwtDecrypt(token, key, { clockTolerance: 15 })
      return true
    } catch {
      // Try next cookie name / wrong key — not a crash, just a miss
    }
  }
  return false
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Only gate the routes that need protection
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const secret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""

  // Try each possible cookie name in priority order
  for (const cookieName of SESSION_COOKIE_NAMES) {
    const rawToken = request.cookies.get(cookieName)?.value
    if (!rawToken) continue

    // Some browsers / next-auth chunk large tokens: cookieName.0, cookieName.1 …
    // Collect all chunks and reassemble if needed.
    let token = rawToken
    const chunk1 = request.cookies.get(`${cookieName}.0`)?.value
    if (chunk1) {
      // Chunked token — reassemble
      let chunks = chunk1
      let i = 1
      while (true) {
        const next = request.cookies.get(`${cookieName}.${i}`)?.value
        if (!next) break
        chunks += next
        i++
      }
      token = chunks
    }

    if (await isValidToken(token, secret)) {
      return NextResponse.next()
    }
  }

  // No valid session found — redirect to login
  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("callbackUrl", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/journal/:path*",
    "/coach/:path*",
    "/habits/:path*",
    "/therapist/:path*",
    "/settings/:path*",
  ],
}
