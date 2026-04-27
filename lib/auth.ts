import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { authConfig } from "@/auth.config"
import { prisma } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        // Rate-limit by IP before touching the database
        if (request) {
          const limited = await rateLimit(request as Request, "login")
          if (limited) return null
        }

        const email = (credentials.email as string).trim().toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        // Block sign-in until email is verified
        if (!user.emailVerified) return null

        return { id: user.id, email: user.email }
      },
    }),
  ],
})
