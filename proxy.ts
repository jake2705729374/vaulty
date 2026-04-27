/**
 * Edge middleware — zero external dependencies.
 *
 * Previous attempts used NextAuth and @panva/hkdf + jose.  Both crashed the
 * Vercel Edge Runtime silently at module-init time (MIDDLEWARE_INVOCATION_FAILED
 * with no log output).  This version uses ONLY next/server — no imports that
 * could touch Node.js internals or Web Crypto at init time.
 *
 * Security note: this middleware is a UX gate only (redirect to /login).
 * Real authentication is enforced in every API route handler via `auth()` from
 * lib/auth.ts (Node runtime), so a forged presence-only cookie still gets 401s
 * from all data endpoints.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const PROTECTED = [
  "/dashboard",
  "/journal",
  "/therapist",
  "/settings",
  "/coach",
  "/habits",
  "/onboarding",
]

// All possible NextAuth v5 / v4 session-cookie names (production + dev + chunked)
const SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "__Secure-authjs.session-token.0",
  "authjs.session-token",
  "authjs.session-token.0",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const hasSession = SESSION_COOKIES.some(
    (name) => !!request.cookies.get(name)?.value,
  )

  if (hasSession) return NextResponse.next()

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = "/login"
  loginUrl.search = `?callbackUrl=${encodeURIComponent(pathname)}`
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
