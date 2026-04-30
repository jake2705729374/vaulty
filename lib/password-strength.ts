/**
 * lib/password-strength.ts
 *
 * Shared password strength logic — runs on both client and server (no browser APIs).
 *
 * Rules (4 requirements, score 0–4):
 *   1. At least 10 characters
 *   2. Uppercase letter (A–Z)
 *   3. Number (0–9)
 *   4. Special character (!@#$ …)
 *
 * Acceptable = score >= 3 AND not a common password.
 * Both the register API and change-password API enforce this server-side.
 * The UI shows a requirements checklist and blocks submission below the threshold.
 */

// ── Common password blocklist ─────────────────────────────────────────────────
// Top ~60 most-used passwords. Checked case-insensitively.
export const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd",
  "123456", "1234567", "12345678", "123456789", "1234567890",
  "12345", "1234", "123", "111111", "000000", "123123",
  "654321", "666666", "121212", "1q2w3e4r", "1q2w3e",
  "qwerty", "qwertyuiop", "qwerty123", "iloveyou",
  "admin", "admin123", "administrator", "welcome", "welcome1",
  "monkey", "dragon", "master", "abc123", "letmein",
  "sunshine", "princess", "football", "baseball", "soccer",
  "shadow", "superman", "batman", "trustno1", "hello",
  "michael", "charlie", "donald", "login", "passme",
  "pass", "access", "summer", "hunter", "mustang",
  "ranger", "pepper", "cheese", "cheese1", "harley",
  "jordan23", "696969", "antonio", "11111111",
])

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PasswordRequirement {
  id:    string
  label: string
  met:   boolean
}

export interface PasswordStrength {
  score:        number               // 0–4
  label:        string
  color:        string
  requirements: PasswordRequirement[]
  isCommon:     boolean
  /** true when the password is acceptable to submit */
  isAcceptable: boolean
}

// ── Core function ─────────────────────────────────────────────────────────────

export function getPasswordStrength(pw: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    { id: "length",  label: "10+ characters",          met: pw.length >= 10 },
    { id: "upper",   label: "Uppercase letter (A–Z)",  met: /[A-Z]/.test(pw) },
    { id: "number",  label: "Number (0–9)",             met: /[0-9]/.test(pw) },
    { id: "special", label: "Special character",        met: /[^A-Za-z0-9]/.test(pw) },
  ]

  const score    = requirements.filter((r) => r.met).length
  const isCommon = pw.length > 0 && COMMON_PASSWORDS.has(pw.toLowerCase())

  let label: string
  let color: string

  if (isCommon)      { label = "Too common"; color = "#EF4444" }
  else if (score <= 1) { label = "Too weak";  color = "#EF4444" }
  else if (score === 2) { label = "Weak";     color = "#F97316" }
  else if (score === 3) { label = "Good";     color = "#22C55E" }
  else                  { label = "Strong";   color = "#10B981" }

  return {
    score,
    label,
    color,
    requirements,
    isCommon,
    // Length is mandatory — score >= 3 out of the remaining three requirements
    // isn't sufficient if the password is too short.
    isAcceptable: pw.length >= 10 && score >= 3 && !isCommon,
  }
}

/**
 * Lightweight server-side check used by API routes.
 * Returns an error string if unacceptable, or null if OK.
 */
export function validatePasswordServer(pw: string): string | null {
  if (!pw || typeof pw !== "string") return "Password is required."
  const s = getPasswordStrength(pw)
  if (s.isCommon)      return "That password is too common. Choose something more unique."
  if (!s.isAcceptable) return "Password must be at least 10 characters and include an uppercase letter, a number, and a special character."
  return null
}
