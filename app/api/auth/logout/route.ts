/**
 * GET /api/auth/logout
 *
 * Server-side logout that bypasses next-auth/react's signOut() entirely.
 * Deletes every possible NextAuth session cookie via the Response API
 * (no async cookies() needed), then redirects to the landing page.
 *
 * Using request.url as the redirect base so it always resolves to the
 * correct origin regardless of NEXTAUTH_URL config.
 */
import { NextRequest, NextResponse } from "next/server"

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
  // Redirect to the root of the same origin the request came from
  const origin = new URL(request.url).origin
  const response = NextResponse.redirect(`${origin}/`)

  // Delete every possible auth cookie
  for (const name of AUTH_COOKIES) {
    response.cookies.delete(name)
  }

  return response
}
