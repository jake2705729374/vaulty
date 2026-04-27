/**
 * GET /api/auth/logout
 *
 * Clears every possible NextAuth session cookie and redirects to "/".
 *
 * WHY THIS FILE EXISTS INSTEAD OF next-auth/react signOut():
 *   - Client-side signOut() triggers a redirect that hits the Edge middleware
 *     while the JWT cookie is in a transitioning state → MIDDLEWARE_INVOCATION_FAILED.
 *   - Server Actions that call NextAuth's signOut() have the same problem.
 *   - This Node-runtime GET route is completely outside the middleware matcher
 *     (/api/auth/* is not listed), so the Edge never sees it.
 *
 * WHY response.cookies.set() INSTEAD OF response.cookies.delete():
 *   - response.cookies.delete(name) calls set(name, "", { expires, path:"/" })
 *     but does NOT include the Secure flag.
 *   - Browsers enforce the __Secure- prefix spec: any Set-Cookie for a
 *     __Secure-* cookie that omits the Secure attribute is silently ignored.
 *   - The cookie therefore survives sign-out, leaving the user authenticated.
 *   - We use response.cookies.set() with explicit Secure:true so the browser
 *     actually honours the deletion.
 */
import { NextRequest, NextResponse } from "next/server"

const AUTH_COOKIES = [
  "__Secure-authjs.session-token",
  "__Secure-authjs.session-token.0",
  "__Secure-authjs.session-token.1",
  "__Secure-authjs.session-token.2",
  "authjs.session-token",          // dev / HTTP fallback
  "authjs.session-token.0",
  "authjs.session-token.1",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-authjs.csrf-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "__Secure-next-auth.csrf-token",
  "next-auth.csrf-token",
  "__Secure-authjs.callback-url",
  "authjs.callback-url",
  "next-auth.callback-url",
]

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin
  const response = NextResponse.redirect(`${origin}/`)

  for (const name of AUTH_COOKIES) {
    // __Secure- and __Host- prefixed cookies require the Secure attribute
    // to be present on any Set-Cookie that modifies them (including deletion).
    // Without it the browser silently ignores the header and the cookie lives on.
    const requiresSecure = name.startsWith("__Secure-") || name.startsWith("__Host-")

    response.cookies.set(name, "", {
      expires:  new Date(0),
      maxAge:   0,
      path:     "/",
      httpOnly: true,
      secure:   requiresSecure,
      sameSite: "lax",
    })
  }

  return response
}
