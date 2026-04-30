/**
 * __tests__/lib/crypto.test.ts
 *
 * Critical-path tests for lib/crypto.ts.
 *
 * Every test here represents a class of bug that would cause silent data loss
 * in production — a wrong return value from decryptWithMek doesn't throw an
 * error; the user just opens a blank or garbled journal entry.
 *
 * Coverage:
 *   ✓ Base64 helpers (round-trip via public API)
 *   ✓ Legacy per-entry encrypt/decrypt (encryptEntry / decryptEntry)
 *   ✓ MEK encrypt/decrypt (encryptWithMek / decryptWithMek)
 *   ✓ Key bundle creation and unlocking (createKeyBundle / unlockMek)
 *   ✓ Password change / MEK re-wrap (rewrapMek)
 *   ✓ Full migration round-trip (legacy → MEK scheme)
 *   ✓ Authentication: wrong key / tampered ciphertext always throws
 *   ✓ Multiple entries share one MEK correctly
 *   ✓ Edge cases: empty string, Unicode + emoji, large (~75 KB) content
 */

import { describe, it, expect } from "vitest"
import {
  generateSalt,
  encryptEntry,
  decryptEntry,
  generateMek,
  deriveKek,
  encryptMek,
  decryptMek,
  createKeyBundle,
  unlockMek,
  encryptWithMek,
  decryptWithMek,
  rewrapMek,
} from "../../lib/crypto"

// ── Helper ─────────────────────────────────────────────────────────────────

/** Export a CryptoKey to raw bytes for equality comparison. */
async function keyBytes(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey("raw", key))
}

// ── generateSalt ───────────────────────────────────────────────────────────

describe("generateSalt", () => {
  it("returns a 16-byte Uint8Array", () => {
    const salt = generateSalt()
    expect(salt).toBeInstanceOf(Uint8Array)
    expect(salt.byteLength).toBe(16)
  })

  it("produces different values on each call (random)", () => {
    const a = generateSalt()
    const b = generateSalt()
    // Probability of collision: 1 / 2^128 — treat equality as test failure
    expect(Array.from(a)).not.toEqual(Array.from(b))
  })
})

// ── Legacy scheme — encryptEntry / decryptEntry ────────────────────────────

describe("encryptEntry / decryptEntry (legacy per-entry scheme)", () => {
  const PASSWORD = "TestPassword1!"

  it("round-trips plain ASCII", async () => {
    const pt = "Hello, world! This is a journal entry."
    const { ciphertext, iv, salt } = await encryptEntry(pt, PASSWORD)
    expect(await decryptEntry(ciphertext, iv, salt, PASSWORD)).toBe(pt)
  })

  it("round-trips Unicode and emoji", async () => {
    const pt = "私の日記 📔 — café résumé naïve — 한국어"
    const { ciphertext, iv, salt } = await encryptEntry(pt, PASSWORD)
    expect(await decryptEntry(ciphertext, iv, salt, PASSWORD)).toBe(pt)
  })

  it("round-trips an empty string", async () => {
    const { ciphertext, iv, salt } = await encryptEntry("", PASSWORD)
    expect(await decryptEntry(ciphertext, iv, salt, PASSWORD)).toBe("")
  })

  it("round-trips a large entry (~75 KB)", async () => {
    const pt = "Journal entry content. ".repeat(3_500) // ~77 KB
    const { ciphertext, iv, salt } = await encryptEntry(pt, PASSWORD)
    expect(await decryptEntry(ciphertext, iv, salt, PASSWORD)).toBe(pt)
  })

  it("produces different ciphertext each call (random IV)", async () => {
    const { ciphertext: c1 } = await encryptEntry("same", PASSWORD)
    const { ciphertext: c2 } = await encryptEntry("same", PASSWORD)
    expect(c1).not.toBe(c2)
  })

  it("throws with the wrong password (AES-GCM authentication)", async () => {
    const { ciphertext, iv, salt } = await encryptEntry("secret", PASSWORD)
    await expect(
      decryptEntry(ciphertext, iv, salt, "WrongPassword1!")
    ).rejects.toThrow()
  })

  it("throws with a tampered ciphertext (bit-flip attack)", async () => {
    const { ciphertext, iv, salt } = await encryptEntry("tamper me", PASSWORD)
    const tampered = ciphertext.slice(0, -4) + "ZZZZ"
    await expect(
      decryptEntry(tampered, iv, salt, PASSWORD)
    ).rejects.toThrow()
  })
})

// ── MEK scheme — encryptWithMek / decryptWithMek ───────────────────────────
// This is THE most critical path. A one-line bug here silently corrupts entries.

describe("encryptWithMek / decryptWithMek (MEK scheme)", () => {
  it("round-trips plain ASCII", async () => {
    const mek = await generateMek()
    const pt  = "My most important journal entry."
    const { ciphertext, iv } = await encryptWithMek(pt, mek)
    expect(await decryptWithMek(ciphertext, iv, mek)).toBe(pt)
  })

  it("round-trips Unicode and emoji", async () => {
    const mek = await generateMek()
    const pt  = "日記 🌸 — résumé — Ñoño — Привет мир"
    const { ciphertext, iv } = await encryptWithMek(pt, mek)
    expect(await decryptWithMek(ciphertext, iv, mek)).toBe(pt)
  })

  it("round-trips an empty string", async () => {
    const mek = await generateMek()
    const { ciphertext, iv } = await encryptWithMek("", mek)
    expect(await decryptWithMek(ciphertext, iv, mek)).toBe("")
  })

  it("round-trips a large entry (~75 KB)", async () => {
    const mek = await generateMek()
    const pt  = "Large journal entry text. ".repeat(3_000)
    const { ciphertext, iv } = await encryptWithMek(pt, mek)
    expect(await decryptWithMek(ciphertext, iv, mek)).toBe(pt)
  })

  it("produces different ciphertext each call (random IV, same MEK)", async () => {
    const mek = await generateMek()
    const { ciphertext: c1 } = await encryptWithMek("same text", mek)
    const { ciphertext: c2 } = await encryptWithMek("same text", mek)
    expect(c1).not.toBe(c2)
  })

  it("throws when decrypting with a different MEK (wrong key)", async () => {
    const mek1 = await generateMek()
    const mek2 = await generateMek()
    const { ciphertext, iv } = await encryptWithMek("secret entry", mek1)
    await expect(decryptWithMek(ciphertext, iv, mek2)).rejects.toThrow()
  })

  it("throws with a tampered ciphertext (AES-GCM authentication)", async () => {
    const mek = await generateMek()
    const { ciphertext, iv } = await encryptWithMek("tamper me", mek)
    const tampered = ciphertext.slice(0, -4) + "ZZZZ"
    await expect(decryptWithMek(tampered, iv, mek)).rejects.toThrow()
  })

  it("throws with a tampered IV", async () => {
    const mek = await generateMek()
    const { ciphertext, iv } = await encryptWithMek("tamper iv", mek)
    const tamperedIv = iv.slice(0, -4) + "ZZZZ"
    await expect(decryptWithMek(ciphertext, tamperedIv, mek)).rejects.toThrow()
  })

  it("multiple entries encrypted with the same MEK all decrypt correctly", async () => {
    const mek     = await generateMek()
    const entries = ["First entry", "Second entry", "Third entry — 日記"]
    const encrypted = await Promise.all(entries.map((e) => encryptWithMek(e, mek)))
    const decrypted = await Promise.all(
      encrypted.map(({ ciphertext, iv }) => decryptWithMek(ciphertext, iv, mek))
    )
    expect(decrypted).toEqual(entries)
  })
})

// ── encryptMek / decryptMek (key wrapping) ─────────────────────────────────

describe("encryptMek / decryptMek (key wrapping)", () => {
  it("round-trips: wrapping then unwrapping recovers the same key bytes", async () => {
    const salt = generateSalt()
    const kek  = await deriveKek("WrapPassword1!", salt)
    const mek  = await generateMek()

    const { encryptedMek, mekIv } = await encryptMek(mek, kek)
    const recovered = await decryptMek(encryptedMek, mekIv, kek)

    expect(await keyBytes(recovered)).toEqual(await keyBytes(mek))
  })

  it("throws when unwrapping with the wrong KEK", async () => {
    const salt  = generateSalt()
    const kek1  = await deriveKek("CorrectPassword1!", salt)
    const kek2  = await deriveKek("WrongPassword1!!", salt)
    const mek   = await generateMek()
    const { encryptedMek, mekIv } = await encryptMek(mek, kek1)

    await expect(decryptMek(encryptedMek, mekIv, kek2)).rejects.toThrow()
  })
})

// ── createKeyBundle / unlockMek ────────────────────────────────────────────

describe("createKeyBundle / unlockMek", () => {
  it("unlockMek recovers the exact MEK bytes from the bundle", async () => {
    const password = "BundlePassword1!"
    const { mek, encryptedMek, mekIv, kekSalt } = await createKeyBundle(password)
    const recovered = await unlockMek(password, { encryptedMek, mekIv, kekSalt })

    expect(await keyBytes(recovered)).toEqual(await keyBytes(mek))
  })

  it("unlockMek with the wrong password throws", async () => {
    const { encryptedMek, mekIv, kekSalt } = await createKeyBundle("RightPassword1!")
    await expect(
      unlockMek("WrongPassword1!", { encryptedMek, mekIv, kekSalt })
    ).rejects.toThrow()
  })

  it("full round-trip: create bundle → encrypt entry → unlock → decrypt", async () => {
    const password = "FullRoundTrip1!"
    const { mek, encryptedMek, mekIv, kekSalt } = await createKeyBundle(password)

    const entry = "My private journal entry 📔 — très secret"
    const { ciphertext, iv } = await encryptWithMek(entry, mek)

    // Simulate a page reload: the only things persisted are the bundle and ciphertext
    const unlockedMek = await unlockMek(password, { encryptedMek, mekIv, kekSalt })
    const decrypted   = await decryptWithMek(ciphertext, iv, unlockedMek)

    expect(decrypted).toBe(entry)
  })

  it("two different passwords produce independent, non-interchangeable bundles", async () => {
    const bundle1 = await createKeyBundle("Password1!")
    const bundle2 = await createKeyBundle("Password2@")

    // Each bundle is only unlockable with its own password
    await expect(
      unlockMek("Password2@", {
        encryptedMek: bundle1.encryptedMek,
        mekIv:        bundle1.mekIv,
        kekSalt:      bundle1.kekSalt,
      })
    ).rejects.toThrow()
  })
})

// ── rewrapMek — password change ────────────────────────────────────────────

describe("rewrapMek (password change)", () => {
  it("entries encrypted with the original MEK decrypt correctly after rewrap", async () => {
    const oldPw = "OldPassword1!"
    const newPw = "NewPassword2@"

    // Create key bundle and encrypt an entry
    const { mek, encryptedMek, mekIv, kekSalt } = await createKeyBundle(oldPw)
    const entry = "This entry must survive a password change"
    const { ciphertext, iv } = await encryptWithMek(entry, mek)

    // Change password: re-wrap the MEK
    const newBundle = await rewrapMek(mek, newPw)

    // Simulate post-password-change page load
    const recovered = await unlockMek(newPw, newBundle)
    const decrypted = await decryptWithMek(ciphertext, iv, recovered)

    expect(decrypted).toBe(entry)
  })

  it("old password can no longer unlock the new bundle", async () => {
    const oldPw = "OldPassword1!"
    const newPw = "NewPassword2@"

    const { mek } = await createKeyBundle(oldPw)
    const newBundle = await rewrapMek(mek, newPw)

    await expect(unlockMek(oldPw, newBundle)).rejects.toThrow()
  })

  it("re-wrapped MEK bytes are identical to the original", async () => {
    const { mek } = await createKeyBundle("OriginalPw1!")
    const newBundle = await rewrapMek(mek, "NewPassword2@")
    const recovered = await unlockMek("NewPassword2@", newBundle)

    expect(await keyBytes(recovered)).toEqual(await keyBytes(mek))
  })

  it("multiple entries all survive the password change", async () => {
    const oldPw = "OldPassword1!"
    const newPw = "NewPassword2@"
    const { mek } = await createKeyBundle(oldPw)

    const entries = ["Entry one", "Entry two — 日記", "Entry three 🔐"]
    const encrypted = await Promise.all(entries.map((e) => encryptWithMek(e, mek)))

    const newBundle = await rewrapMek(mek, newPw)
    const recovered = await unlockMek(newPw, newBundle)

    const decrypted = await Promise.all(
      encrypted.map(({ ciphertext, iv }) => decryptWithMek(ciphertext, iv, recovered))
    )
    expect(decrypted).toEqual(entries)
  })
})

// ── Migration — legacy per-entry scheme → MEK scheme ──────────────────────

describe("migration (legacy → MEK scheme)", () => {
  it("re-encrypts a legacy entry with the MEK and recovers it correctly", async () => {
    const password  = "MigrationPw1!"
    const plaintext = "An old journal entry from before the envelope encryption migration"

    // Step 1: entry was saved with the old per-entry password derivation
    const legacy = await encryptEntry(plaintext, password)

    // Step 2: create a new key bundle (happens once during migration)
    const { mek, encryptedMek, mekIv, kekSalt } = await createKeyBundle(password)

    // Step 3: client decrypts with old scheme, re-encrypts with MEK
    const decryptedLegacy = await decryptEntry(legacy.ciphertext, legacy.iv, legacy.salt, password)
    const newEnc          = await encryptWithMek(decryptedLegacy, mek)

    // Step 4: simulate page reload — unlock MEK from bundle, decrypt new ciphertext
    const unlockedMek = await unlockMek(password, { encryptedMek, mekIv, kekSalt })
    const final       = await decryptWithMek(newEnc.ciphertext, newEnc.iv, unlockedMek)

    expect(final).toBe(plaintext)
  })

  it("migrates multiple entries and all are recoverable", async () => {
    const password  = "MigrationPw2@"
    const originals = [
      "First old entry",
      "Second old entry — with Unicode 日記",
      "Third old entry 🔐 with emoji",
    ]

    // Encrypt all with legacy scheme
    const legacyEntries = await Promise.all(originals.map((e) => encryptEntry(e, password)))

    // Create key bundle and re-encrypt all entries
    const { mek, encryptedMek, mekIv, kekSalt } = await createKeyBundle(password)

    const newEntries = await Promise.all(
      legacyEntries.map(async ({ ciphertext, iv, salt }) => {
        const pt = await decryptEntry(ciphertext, iv, salt, password)
        return encryptWithMek(pt, mek)
      })
    )

    // Simulate post-migration: unlock MEK, decrypt all entries
    const unlockedMek = await unlockMek(password, { encryptedMek, mekIv, kekSalt })
    const decrypted   = await Promise.all(
      newEntries.map(({ ciphertext, iv }) => decryptWithMek(ciphertext, iv, unlockedMek))
    )

    expect(decrypted).toEqual(originals)
  })
})
