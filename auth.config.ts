/**
 * Edge-compatible auth config — no Prisma or Node-only imports.
 * Used by middleware (Edge Runtime) and re-used by lib/auth.ts (Node Runtime).
 */
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const authConfig: NextAuthConfig = {
  providers: [
    // authorize() is intentionally empty here — full logic lives in lib/auth.ts
    // which runs in Node Runtime and can access Prisma.
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = ["/journal", "/therapist", "/settings"].some((p) =>
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
