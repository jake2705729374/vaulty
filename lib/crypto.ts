/**
 * Client-side AES-GCM encryption using the Web Crypto API.
 *
 * Two-layer scheme (envelope encryption):
 *   • Each user has a random 256-bit Master Encryption Key (MEK).
 *   • The MEK is wrapped with a Key Encryption Key (KEK) derived from the
 *     user's password via PBKDF2.  Only the wrapped MEK blob is stored on
 *     the server — the raw MEK never leaves the browser.
 *   • Journal entries are encrypted directly with the MEK, so changing the
 *     password only re-wraps the tiny MEK blob; entries are never touched.
 *
 * Legacy (per-entry password derivation) functions are kept for migration.
 */

const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH = 256

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encryptEntry(
  plaintext: string,
  password: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const salt = generateSalt()
  const key = await deriveKey(password, salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  )
  return {
    ciphertext: toBase64(ciphertextBuffer),
    iv: toBase64(iv),
    salt: toBase64(salt),
  }
}

export async function decryptEntry(
  ciphertext: string,
  iv: string,
  salt: string,
  password: string
): Promise<string> {
  const key = await deriveKey(password, fromBase64(salt))
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    key,
    fromBase64(ciphertext)
  )
  return new TextDecoder().decode(plaintextBuffer)
}

// ── Envelope encryption — MEK / KEK helpers ───────────────────────────────

/** Generate a fresh random 256-bit Master Encryption Key (MEK). */
export async function generateMek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_LENGTH },
    true,   // extractable so we can export + re-wrap on password change
    ["encrypt", "decrypt"],
  )
}

/**
 * Derive a Key Encryption Key (KEK) from the user's password.
 * Same PBKDF2 parameters as per-entry derivation — consistent security level.
 */
export async function deriveKek(password: string, salt: Uint8Array): Promise<CryptoKey> {
  return deriveKey(password, salt)
}

/** Wrap (AES-GCM encrypt) the MEK with the KEK. Returns base64 blob + IV. */
export async function encryptMek(
  mek: CryptoKey,
  kek: CryptoKey,
): Promise<{ encryptedMek: string; mekIv: string }> {
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const raw = await crypto.subtle.exportKey("raw", mek)
  const blob = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, raw)
  return { encryptedMek: toBase64(blob), mekIv: toBase64(iv) }
}

/** Unwrap (AES-GCM decrypt) the MEK using the KEK. Returns usable CryptoKey. */
export async function decryptMek(
  encryptedMek: string,
  mekIv: string,
  kek: CryptoKey,
): Promise<CryptoKey> {
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(mekIv) },
    kek,
    fromBase64(encryptedMek),
  )
  return crypto.subtle.importKey(
    "raw", raw, { name: "AES-GCM", length: KEY_LENGTH }, true, ["encrypt", "decrypt"],
  )
}

// ── High-level key-bundle helpers ─────────────────────────────────────────

export interface KeyBundle {
  encryptedMek: string
  mekIv:        string
  kekSalt:      string
}

/**
 * Unlock the MEK from a stored key bundle.
 * Called on every page load when we have the password + bundle from the server.
 */
export async function unlockMek(password: string, bundle: KeyBundle): Promise<CryptoKey> {
  const kek = await deriveKek(password, fromBase64(bundle.kekSalt))
  return decryptMek(bundle.encryptedMek, bundle.mekIv, kek)
}

/**
 * Create a brand-new key bundle for a given password.
 * Used during one-time migration and at account creation.
 */
export async function createKeyBundle(password: string): Promise<{
  mek:          CryptoKey
  encryptedMek: string
  mekIv:        string
  kekSalt:      string
}> {
  const salt = generateSalt()
  const kek  = await deriveKek(password, salt)
  const mek  = await generateMek()
  const { encryptedMek, mekIv } = await encryptMek(mek, kek)
  return { mek, encryptedMek, mekIv, kekSalt: toBase64(salt) }
}

/**
 * Re-wrap an existing MEK with a new password (password change).
 * The journal entries themselves do NOT need to be re-encrypted.
 */
export async function rewrapMek(
  mek: CryptoKey,
  newPassword: string,
): Promise<KeyBundle> {
  const salt = generateSalt()
  const kek  = await deriveKek(newPassword, salt)
  const { encryptedMek, mekIv } = await encryptMek(mek, kek)
  return { encryptedMek, mekIv, kekSalt: toBase64(salt) }
}

// ── Entry encryption with the MEK ─────────────────────────────────────────

/**
 * Encrypt entry content with the MEK.
 * Returns { ciphertext, iv } — no per-entry salt needed (salt=null in DB).
 */
export async function encryptWithMek(
  plaintext: string,
  mek: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const blob = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    mek,
    new TextEncoder().encode(plaintext),
  )
  return { ciphertext: toBase64(blob), iv: toBase64(iv) }
}

/** Decrypt an entry body that was encrypted with the MEK (salt=null in DB). */
export async function decryptWithMek(
  ciphertext: string,
  iv: string,
  mek: CryptoKey,
): Promise<string> {
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    mek,
    fromBase64(ciphertext),
  )
  return new TextDecoder().decode(raw)
}
