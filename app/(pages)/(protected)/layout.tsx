/**
 * (protected)/layout.tsx — Server-side auth gate for all protected pages.
 *
 * Every page inside (protected)/ MUST be rendered by an authenticated user.
 * This layout calls auth() (Node runtime, reads the JWT cookie) on every request
 * and redirects to /login before any page code runs if the session is missing.
 *
 * Why this exists alongside the Edge middleware (proxy.ts):
 *   - proxy.ts is the first line of defence — runs fast at the Edge on incoming
 *     requests, blocks unauthenticated requests before they hit the origin.
 *   - This layout is the second line of defence — if the Edge middleware is ever
 *     bypassed (CDN cache miss-routing, stale cached HTML, etc.), the server still
 *     refuses to render the page for an unauthenticated user.
 *   - It also converts all protected pages from ○ (Static) to ƒ (Dynamic), which
 *     means Vercel never caches their HTML — eliminating the attack surface where
 *     a previously-cached authenticated page shell could be served to logged-out users.
 */
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return <>{children}</>
}
