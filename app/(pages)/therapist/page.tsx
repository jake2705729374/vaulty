import { redirect } from "next/navigation"

// The AI Therapist has been renamed to Coach.
// This redirect ensures old bookmarks and links continue to work.
export default function TherapistRedirect() {
  redirect("/coach")
}
