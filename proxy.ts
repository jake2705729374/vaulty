/**
 * proxy.ts — Edge middleware for Next.js 16
 *
 * Next.js 16 uses "proxy.ts" — "middleware.ts" is deprecated and will fail to build.
 *
 * When you call auth(handler), NextAuth decodes the JWT and sets req.auth before
 * your handler runs. Your handler is responsible for deciding what to do with that
 * information. We were previously always returning NextResponse.next() regardless
 * of auth state — meaning unauthenticated users were waved straight through to
 * protected pages. This version explicitly checks req.auth and hard-redirects to
 * /login if the user has no valid session.
 *
 * RULES — never break these:
 *   1. No Prisma imports. Prisma uses Node.js built-ins that crash the Edge Runtime.
 *   2. No Credentials provider imports. Same reason.
 *   3. Sign-out must go through /api/auth/logout (Node runtime), NOT client-side
 *      signOut() from next-auth/react. That function hits this middleware with a
 *      transitioning JWT and causes MIDDLEWARE_INVOCATION_FAILED.
 */
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

/**
 * Every path that requires an authenticated session.
 * Must stay in sync with auth.config.ts PROTECTED_PATHS.
 */
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
 * auth(handler) — NextAuth v5 middleware form.
 *
 * NextAuth decodes the JWT and attaches the session to req.auth before this
 * handler runs. We then:
 *   1. Check if the requested path is protected AND the user has no session →
 *      hard redirect to /login (this is the actual security gate).
 *   2. Otherwise forward the request and attach production security headers.
 */
export const proxy = auth((req) => {
  try {
    const isLoggedIn  = !!req.auth?.user
    const pathname    = req.nextUrl.pathname
    const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))

    // ── Security gate ──────────────────────────────────────────────────────
    // Unauthenticated request to a protected route → redirect to /login.
    // This runs at the Edge before any page code or static asset is served.
    if (isProtected && !isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ── Authenticated (or public route) ───────────────────────────────────
    // Forward the request and add security headers to the response.
    const res = NextResponse.next()

    // Prevent the app from being embedded in iframes (clickjacking defence)
    res.headers.set("X-Frame-Options", "DENY")
    // Stop browsers guessing content types (MIME-sniffing defence)
    res.headers.set("X-Content-Type-Options", "nosniff")
    // Limit referrer information sent to third-party sites
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    // Lock down browser features the app doesn't use
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    // Force HTTPS for 2 years (Vercel already enforces this; belt-and-suspenders)
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    )

    return res

  } catch {
    // ── Safety net ────────────────────────────────────────────────────────
    // If anything throws unexpectedly inside the middleware (e.g. a JWT decode
    // edge case), redirect to the branded error page instead of crashing the
    // Edge Runtime and showing Vercel's raw error screen.
    try {
      return NextResponse.redirect(new URL("/oops", req.url))
    } catch {
      // Absolute last resort — req.url was somehow unparseable
      return new NextResponse("An unexpected error occurred.", { status: 500 })
    }
  }
})

/**
 * Invoke this middleware only on the protected routes.
 * /api/auth/* is intentionally excluded — NextAuth's own callbacks and our
 * custom /api/auth/logout route must be reachable without authentication.
 */
export const config = {
  matcher: [
    /*
     * Use (.*) instead of /:path* — the latter does not reliably match the
     * bare path (e.g. /dashboard with no trailing segment) in Next.js 16.
     * (.*) is a regex wildcard that matches the path itself AND any sub-paths.
     */
    "/dashboard(.*)",
    "/onboarding(.*)",
    "/journal(.*)",
    "/coach(.*)",
    "/habits(.*)",
    "/therapist(.*)",
    "/settings(.*)",
  ],
}
