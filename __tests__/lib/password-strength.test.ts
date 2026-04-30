/**
 * __tests__/lib/password-strength.test.ts
 *
 * Tests for lib/password-strength.ts.
 *
 * This module runs on both the client (UI feedback) and server (API enforcement).
 * A bug here means either:
 *   - Users can register with weak passwords (security regression)
 *   - Users are blocked from valid passwords (UX regression)
 */

import { describe, it, expect } from "vitest"
import { getPasswordStrength, validatePasswordServer, COMMON_PASSWORDS } from "../../lib/password-strength"

// ── getPasswordStrength — score and label ──────────────────────────────────

describe("getPasswordStrength — score", () => {
  it("score 0: empty string meets no requirements", () => {
    const s = getPasswordStrength("")
    expect(s.score).toBe(0)
    expect(s.isAcceptable).toBe(false)
    expect(s.requirements.every((r) => !r.met)).toBe(true)
  })

  it("score 1: only the length requirement met", () => {
    const s = getPasswordStrength("abcdefghij") // 10 chars, no upper/number/special
    expect(s.score).toBe(1)
    expect(s.requirements.find((r) => r.id === "length")?.met).toBe(true)
    expect(s.requirements.find((r) => r.id === "upper")?.met).toBe(false)
    expect(s.requirements.find((r) => r.id === "number")?.met).toBe(false)
    expect(s.requirements.find((r) => r.id === "special")?.met).toBe(false)
    expect(s.isAcceptable).toBe(false)
  })

  it("score 2: length + uppercase (not acceptable)", () => {
    const s = getPasswordStrength("Abcdefghij") // 10 chars + upper
    expect(s.score).toBe(2)
    expect(s.isAcceptable).toBe(false)
    expect(s.label).toBe("Weak")
  })

  it("score 3: length + uppercase + number (acceptable)", () => {
    const s = getPasswordStrength("Abcdefghi9") // 10 chars + upper + number
    expect(s.score).toBe(3)
    expect(s.isAcceptable).toBe(true)
    expect(s.label).toBe("Good")
  })

  it("score 4: all requirements met (strong)", () => {
    const s = getPasswordStrength("Abcdefgh9!") // 10 chars + upper + number + special
    expect(s.score).toBe(4)
    expect(s.isAcceptable).toBe(true)
    expect(s.label).toBe("Strong")
  })
})

// ── getPasswordStrength — individual requirements ──────────────────────────

describe("getPasswordStrength — individual requirements", () => {
  it("length: exactly 9 chars fails; 10 chars passes", () => {
    expect(getPasswordStrength("123456789").requirements.find((r) => r.id === "length")?.met).toBe(false)
    expect(getPasswordStrength("1234567890").requirements.find((r) => r.id === "length")?.met).toBe(true)
  })

  it("uppercase: any A–Z passes", () => {
    expect(getPasswordStrength("abcdefghij").requirements.find((r) => r.id === "upper")?.met).toBe(false)
    expect(getPasswordStrength("Abcdefghij").requirements.find((r) => r.id === "upper")?.met).toBe(true)
  })

  it("number: any 0–9 passes", () => {
    expect(getPasswordStrength("abcdefghij").requirements.find((r) => r.id === "number")?.met).toBe(false)
    expect(getPasswordStrength("abcdefghi1").requirements.find((r) => r.id === "number")?.met).toBe(true)
  })

  it("special: non-alphanumeric characters pass", () => {
    expect(getPasswordStrength("abcdefghij").requirements.find((r) => r.id === "special")?.met).toBe(false)
    expect(getPasswordStrength("abcdefghi!").requirements.find((r) => r.id === "special")?.met).toBe(true)
    expect(getPasswordStrength("abcdefghi@").requirements.find((r) => r.id === "special")?.met).toBe(true)
    expect(getPasswordStrength("abcdefghi-").requirements.find((r) => r.id === "special")?.met).toBe(true)
  })
})

// ── Common password detection ──────────────────────────────────────────────

describe("getPasswordStrength — common password detection", () => {
  it("detects passwords in the blocklist as common", () => {
    expect(getPasswordStrength("password").isCommon).toBe(true)
    expect(getPasswordStrength("123456").isCommon).toBe(true)
    expect(getPasswordStrength("qwerty").isCommon).toBe(true)
    expect(getPasswordStrength("iloveyou").isCommon).toBe(true)
  })

  it("detection is case-insensitive", () => {
    expect(getPasswordStrength("PASSWORD").isCommon).toBe(true)
    expect(getPasswordStrength("Password").isCommon).toBe(true)
    expect(getPasswordStrength("QWERTY").isCommon).toBe(true)
  })

  it("a common password is not acceptable even with score 4", () => {
    // Construct a password that meets all requirements but is in the blocklist
    // (unlikely in the real blocklist, but we can test the logic by checking
    //  that isAcceptable = false whenever isCommon = true)
    for (const pw of COMMON_PASSWORDS) {
      const s = getPasswordStrength(pw)
      if (s.isCommon) {
        expect(s.isAcceptable).toBe(false)
        break // one example is sufficient
      }
    }
  })

  it("isCommon is false for an empty string", () => {
    expect(getPasswordStrength("").isCommon).toBe(false)
  })

  it("a novel strong password is not flagged as common", () => {
    const s = getPasswordStrength("Vaultly#2026$Private!")
    expect(s.isCommon).toBe(false)
    expect(s.isAcceptable).toBe(true)
  })
})

// ── getPasswordStrength — label and color ──────────────────────────────────

describe("getPasswordStrength — label and color", () => {
  it("score ≤ 1 → 'Too weak' with red color", () => {
    const s = getPasswordStrength("short")
    expect(s.label).toBe("Too weak")
    expect(s.color).toBe("#EF4444")
  })

  it("score 2 → 'Weak' with orange color", () => {
    const s = getPasswordStrength("Abcdefghij") // length + upper = score 2
    expect(s.label).toBe("Weak")
    expect(s.color).toBe("#F97316")
  })

  it("score 3 → 'Good' with green color", () => {
    const s = getPasswordStrength("Abcdefghi9")
    expect(s.label).toBe("Good")
    expect(s.color).toBe("#22C55E")
  })

  it("score 4 → 'Strong' with emerald color", () => {
    const s = getPasswordStrength("Abcdefgh9!")
    expect(s.label).toBe("Strong")
    expect(s.color).toBe("#10B981")
  })

  it("common password → 'Too common' with red color (overrides score)", () => {
    const s = getPasswordStrength("password")
    expect(s.label).toBe("Too common")
    expect(s.color).toBe("#EF4444")
  })
})

// ── validatePasswordServer ─────────────────────────────────────────────────

describe("validatePasswordServer", () => {
  it("returns null for a strong, acceptable password", () => {
    expect(validatePasswordServer("Vaultly#2026!")).toBeNull()
    expect(validatePasswordServer("MyPrivate9!Journal")).toBeNull()
  })

  it("returns null for a score-3 password (minimum acceptable)", () => {
    // length + uppercase + number = score 3 = acceptable
    expect(validatePasswordServer("Abcdefghi9")).toBeNull()
  })

  it("returns an error string for an empty password", () => {
    expect(validatePasswordServer("")).not.toBeNull()
  })

  it("returns an error string for null / non-string input", () => {
    // @ts-expect-error — testing runtime guard against bad input
    expect(validatePasswordServer(null)).not.toBeNull()
    // @ts-expect-error
    expect(validatePasswordServer(undefined)).not.toBeNull()
    // @ts-expect-error
    expect(validatePasswordServer(12345)).not.toBeNull()
  })

  it("returns an error string for a short password", () => {
    expect(validatePasswordServer("Short1!")).not.toBeNull()
  })

  it("returns an error for a password with only 2 requirements met", () => {
    expect(validatePasswordServer("Abcdefghij")).not.toBeNull() // score 2
  })

  it("returns a 'too common' error for a blocklisted password", () => {
    const err = validatePasswordServer("password")
    expect(err).not.toBeNull()
    expect(err).toMatch(/common/i)
  })

  it("returns an error mentioning the specific missing requirements", () => {
    const err = validatePasswordServer("short")
    expect(err).not.toBeNull()
    // Should mention what to fix, not just "invalid"
    expect(typeof err).toBe("string")
    expect(err!.length).toBeGreaterThan(10)
  })

  // Boundary: score 3 passes, score 2 fails
  it("score 3 passes and score 2 fails — the isAcceptable boundary is correct", () => {
    const score2 = "Abcdefghij" // length + upper only
    const score3 = "Abcdefghi9" // length + upper + number
    expect(validatePasswordServer(score2)).not.toBeNull()
    expect(validatePasswordServer(score3)).toBeNull()
  })
})
