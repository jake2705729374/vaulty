import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

// Edge-compatible auth middleware using JWT-only config (no Prisma).
// authConfig includes trustHost:true which is required on Vercel to prevent
// JWT decode failures (and the resulting MIDDLEWARE_INVOCATION_FAILED on sign-out).
const { auth } = NextAuth(authConfig)

export const proxy = auth

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
