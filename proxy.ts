/**
 * proxy.ts — Edge middleware for Next.js 16
 *
 * Next.js 16 deprecated `middleware.ts` in favour of `proxy.ts`.
 * This file runs in the Vercel Edge Runtime on every matched request.
 *
 * What it does:
 *   1. JWT validation — NextAuth reads the session cookie and decodes the JWT.
 *      No database call is made here (Prisma is Node-only and cannot run at the Edge).
 *   2. Route protection — the `authorized` callback in auth.config.ts gates every
 *      path listed in PROTECTED_PATHS.  Unauthenticated requests are redirected to
 *      /login automatically by NextAuth.
 *   3. Security headers — applied to every forwarded response via NextResponse.next().
 *
 * What it does NOT do:
 *   - Sign-out: handled by /api/auth/logout (Node runtime) to avoid JWT decode
 *     errors during cookie transitions in the Edge Runtime.
 *   - Credential validation: Credentials provider lives in lib/auth.ts (Node only).
 *
 * IMPORTANT: Keep this file free of Prisma, Node built-ins, and provider imports.
 * Those will cause MIDDLEWARE_INVOCATION_FAILED at the Edge.
 */
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

/**
 * auth(callback) — NextAuth v5 middleware form.
 *
 * Flow:
 *  1. NextAuth validates the JWT and runs the `authorized` callback (auth.config.ts).
 *  2. If `authorized` returns false → NextAuth redirects to /login automatically.
 *  3. If `authorized` returns true  → our callback runs and adds security headers.
 */
export const proxy = auth((_req) => {
  const res = NextResponse.next()

  // Prevent the app from being embedded in iframes (clickjacking defence)
  res.headers.set("X-Frame-Options", "DENY")
  // Stop browsers guessing content types (MIME-sniffing defence)
  res.headers.set("X-Content-Type-Options", "nosniff")
  // Limit referrer information sent to third-party sites
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  // Lock down browser features that aren't needed
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  // Force HTTPS for 2 years (applied once the site is on a real domain)
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  )

  return res
})

/**
 * Limit middleware invocations to protected routes only.
 * Public paths (landing page, /login, /register, /api/auth/*) are excluded so
 * NextAuth's CSRF and callback routes are never intercepted by the middleware.
 */
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
