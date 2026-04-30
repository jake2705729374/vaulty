/**
 * lib/validation.ts
 *
 * Zod schemas for API request bodies.
 *
 * Usage in an API route:
 *   import { EntryBodySchema, parseBody } from "@/lib/validation"
 *
 *   const result = EntryBodySchema.safeParse(await req.json())
 *   if (!result.success) {
 *     return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
 *   }
 *   const { title, ciphertext, iv, salt, mood } = result.data
 */

import { z } from "zod"
import { NextResponse } from "next/server"

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum JSON body size for encrypted-entry routes (POST/PUT /api/entries) */
export const MAX_ENTRY_BODY_BYTES = 2 * 1024 * 1024  // 2 MB

/** Maximum JSON body size for general API routes */
export const MAX_BODY_BYTES = 64 * 1024               // 64 KB

// ── Shared primitives ─────────────────────────────────────────────────────────

export const MoodSchema = z.enum(["GREAT", "GOOD", "OKAY", "LOW", "AWFUL"])

// Base64-encoded AES-GCM output — only base64url chars + padding
const Base64String = z.string().regex(/^[A-Za-z0-9+/=_-]+$/, "Must be base64-encoded")

// ── Entry schemas ─────────────────────────────────────────────────────────────

/**
 * Body for POST /api/entries and PUT /api/entries/[id].
 *
 * ciphertext and iv are base64-encoded AES-256-GCM output.
 * mood is the Prisma Mood enum value; null removes any existing log.
 */
export const EntryBodySchema = z.object({
  title:      z.string().max(500).optional(),
  ciphertext: Base64String.min(1).max(1_900_000),  // ~1.4 MB plaintext max
  iv:         Base64String.min(1).max(256),
  salt:       Base64String.max(256).nullable().optional(),
  mood:       MoodSchema.nullable().optional(),
})

export type EntryBody = z.infer<typeof EntryBodySchema>

// ── Auth schemas ──────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email:    z.string().email("Invalid email address").max(254),
  password: z.string().min(1).max(1024),
})

export const ResetPasswordSchema = z.object({
  email:        z.string().email().max(254),
  code:         z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/),
  newPassword:  z.string().min(1).max(1024),
  encryptedMek: z.string().max(4096).optional(),
  mekIv:        z.string().max(256).optional(),
  kekSalt:      z.string().max(256).optional(),
})

// ── Habit schemas ─────────────────────────────────────────────────────────────

export const HabitBodySchema = z.object({
  name:        z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color").optional(),
  order:       z.number().int().min(0).optional(),
})

export const HabitLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
})

// ── Helper: size guard ────────────────────────────────────────────────────────

/**
 * Returns a 413 Response if the Content-Length header exceeds maxBytes.
 * This is a fast pre-check before reading the body — it can be spoofed,
 * so Zod schema .max() on ciphertext provides the actual enforcement.
 */
export function checkContentLength(
  req: { headers: { get(name: string): string | null } },
  maxBytes: number,
): NextResponse | null {
  const raw = req.headers.get("content-length")
  if (raw) {
    const len = parseInt(raw, 10)
    if (!isNaN(len) && len > maxBytes) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 })
    }
  }
  return null
}

/**
 * Parse + validate a Zod schema against a raw JSON string.
 * Returns { data } on success or { error, response } on failure.
 */
export function parseBody<T>(
  raw: string,
  schema: z.ZodType<T>,
  maxBytes: number,
): { data: T; error?: never } | { data?: never; error: NextResponse } {
  if (raw.length > maxBytes) {
    return {
      error: NextResponse.json({ error: "Request body too large" }, { status: 413 }),
    }
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    }
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid request body"
    return {
      error: NextResponse.json({ error: message }, { status: 400 }),
    }
  }

  return { data: result.data }
}
