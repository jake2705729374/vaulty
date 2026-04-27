/**
 * Edge-compatible auth config — no Prisma or Node-only imports.
 *
 * Used by:
 *   - middleware.ts  (Edge Runtime) — validates JWTs and gates protected routes
 *   - lib/auth.ts    (Node Runtime) — full NextAuth config with Credentials provider
 *
 * RULES:
 *   1. No provider imports here, ever. Even a no-op Credentials import pulls in
 *      Node-only modules that crash the Edge Runtime (MIDDLEWARE_INVOCATION_FAILED).
 *      The Credentials provider lives exclusively in lib/auth.ts.
 *   2. No Prisma imports. Prisma uses Node.js built-ins not available in Edge.
 *   3. trustHost: true is required on Vercel — the proxy sets a Host header that
 *      differs from NEXTAUTH_URL, which would otherwise break JWT decode.
 */
import type { NextAuthConfig } from "next-auth"

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

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * Called by the Edge middleware on every matched request.
     * Return false → NextAuth redirects to pages.signIn (/login).
     * Return true  → request proceeds normally.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn  = !!auth?.user
      const isProtected = PROTECTED_PATHS.some((p) =>
        nextUrl.pathname.startsWith(p),
      )
      if (isProtected && !isLoggedIn) return false
      return true
    },

    // Persist the user id in the JWT so session.user.id is available everywhere.
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
  session: { strategy: "jwt" },
}
