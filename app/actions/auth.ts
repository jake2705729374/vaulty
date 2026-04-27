"use server"

/**
 * Server Action: sign out.
 *
 * Calls NextAuth's own signOut() server-side so it clears its cookies with
 * the exact same attributes it used when setting them (Secure, HttpOnly,
 * SameSite, Path).  Our previous custom /api/auth/logout route called
 * response.cookies.delete(name) which never set Secure:true — browsers
 * silently ignore deletions of __Secure-prefixed cookies that lack the
 * Secure flag, leaving the session token alive after "sign-out".
 */
import { signOut } from "@/lib/auth"

export async function signOutAction() {
  await signOut({ redirectTo: "/" })
}
