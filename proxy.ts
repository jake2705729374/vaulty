import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

// Edge-compatible auth middleware using JWT-only config (no Prisma)
const { auth } = NextAuth(authConfig)

export const proxy = auth

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/journal/:path*", "/therapist/:path*", "/settings/:path*"],
}
