/**
 * Edge-compatible auth config — no Prisma or Node-only imports.
 * Used by proxy.ts (Edge Runtime) and re-used by lib/auth.ts (Node Runtime).
 *
 * IMPORTANT: Do NOT import any providers here. Even a no-op Credentials
 * provider can pull in modules that aren't Edge-safe, causing
 * MIDDLEWARE_INVOCATION_FAILED on Vercel. The Credentials provider lives
 * exclusively in lib/auth.ts which runs in Node Runtime.
 */
import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  // Required on Vercel: proxy headers mean the request Host differs from
  // NEXTAUTH_URL. Without trustHost the JWT decode fails mid-request.
  trustHost: true,
  // No providers — the Edge middleware only needs to validate JWTs,
  // not authenticate credentials. Full Credentials logic is in lib/auth.ts.
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = ["/dashboard", "/journal", "/therapist", "/settings"].some((p) =>
        nextUrl.pathname.startsWith(p)
      )
      if (isProtected && !isLoggedIn) return false
      return true
    },
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
