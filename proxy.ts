/**
 * proxy.ts — Edge middleware for Next.js 16
 *
 * DELIBERATELY does not import NextAuth or call auth().
 * Previous versions wrapped everything in auth(callback) which depends on
 * NextAuth's internal JWT decode running cleanly in the Edge Runtime.  When
 * that decode had any issue (compatibility, cookie state) the gate silently
 * failed.
 *
 * This version uses a plain cookie-presence check:
 *   • Fast — no JWT decode, no async work
 *   • Reliable — req.cookies.has() never throws
 *   • Correct — if the session cookie is absent, the user is not signed in
 *
 * Full JWT validation still happens in app/(pages)/(protected)/layout.tsx
 * (Node runtime, calls auth() from lib/auth.ts).  The two layers are
 * intentionally independent so there is no single point of failure.
 *
 * RULES — never break these:
 *   1. No Prisma imports — Prisma uses Node.js built-ins unavailable in Edge.
 *   2. No next-auth/providers imports — same reason.
 *   3. Sign-out MUST use the signOutAction Server Action (app/actions/auth.ts)
 *      which calls NextAuth's own signOut().  Any other approach risks leaving
 *      __Secure-prefixed cookies alive because plain cookie deletion without
 *      Secure:true is silently ignored by browsers.
 */
import { NextRequest, NextResponse } from "next/server"

/** Every path that requires an authenticated session. */
const PROTECTED_PATHS = [
  "/dashboard",
  "/journal",
  "/coach",
  "/habits",
  "/therapist",
  "/settings",
  "/onboarding",
]

/**
 * Cookie names set by NextAuth v5 for JWT sessions.
 * Production (HTTPS) uses the __Secure- prefix; development (HTTP) does not.
 * Large JWTs are split into numbered chunks (.0, .1 …).
 */
const SESSION_COOKIES = [
  "__Secure-authjs.session-token",    // production, unchunked
  "__Secure-authjs.session-token.0",  // production, chunked
  "__Secure-authjs.session-token.1",  // production, chunked part 2
  "authjs.session-token",             // development, unchunked
  "authjs.session-token.0",           // development, chunked
]

export function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))

    if (isProtected) {
      // Cookie-presence check: if no session cookie exists the user is signed out.
      // JWT validity is checked separately in the (protected) layout (Node runtime).
      const signedIn = SESSION_COOKIES.some((name) => request.cookies.has(name))

      if (!signedIn) {
        return NextResponse.redirect(new URL("/login", request.url))
      }
    }

    // Attach security headers to every forwarded response
    const response = NextResponse.next()
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    )
    return response

  } catch {
    // Redirect to the branded error page rather than crashing the Edge Runtime
    try {
      return NextResponse.redirect(new URL("/oops", request.url))
    } catch {
      return new NextResponse("An unexpected error occurred.", { status: 500 })
    }
  }
}

export const config = {
  matcher: [
    "/dashboard(.*)",
    "/onboarding(.*)",
    "/journal(.*)",
    "/coach(.*)",
    "/habits(.*)",
    "/therapist(.*)",
    "/settings(.*)",
  ],
}
