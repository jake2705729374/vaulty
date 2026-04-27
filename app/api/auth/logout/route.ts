/**
 * GET /api/auth/logout
 *
 * Server-side logout — bypasses next-auth/react's client signOut() entirely.
 *
 * Why a custom route instead of signOut() from next-auth/react?
 * The client-side signOut() triggers a CSRF prefetch + POST to /api/auth/signout,
 * and the subsequent redirect was consistently causing MIDDLEWARE_INVOCATION_FAILED
 * on Vercel regardless of the middleware implementation.
 *
 * This route runs in Node Runtime (not Edge), so it can use the cookies() API to
 * explicitly delete every possible NextAuth session cookie, then redirect to "/".
 * No middleware runs on /api/auth/logout (not in the middleware matcher).
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// Every possible NextAuth v4/v5 cookie name (production __Secure- prefix + dev)
const AUTH_COOKIES = [
  "__Secure-authjs.session-token",
  "__Secure-authjs.session-token.0",
  "__Secure-authjs.session-token.1",
  "__Secure-authjs.session-token.2",
  "authjs.session-token",
  "authjs.session-token.0",
  "authjs.session-token.1",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  // CSRF & callback cookies (clean up everything)
  "__Secure-authjs.csrf-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "__Secure-next-auth.csrf-token",
  "next-auth.csrf-token",
  "__Secure-authjs.callback-url",
  "authjs.callback-url",
  "next-auth.callback-url",
]

export async function GET() {
  const jar = await cookies()

  for (const name of AUTH_COOKIES) {
    try {
      jar.delete(name)
    } catch {
      // cookie may not exist — ignore
    }
  }

  // Redirect to landing page after clearing cookies
  return NextResponse.redirect(
    new URL("/", process.env.NEXTAUTH_URL ?? "https://vaultly-sepia.vercel.app"),
  )
}
