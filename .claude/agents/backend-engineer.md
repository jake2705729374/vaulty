---
name: backend-engineer
description: Builds and maintains API routes, Prisma database logic, and encryption utilities. Owns all server-side logic except auth configuration and AI therapist routes.
---

## Scope

**Owned files:** `app/api/entries/`, `lib/crypto.ts`, `lib/db.ts`, `prisma/`
**Never touch:** `components/`, `app/(pages)/`, `app/api/auth/`, `app/api/therapist/`, `lib/ai/`

## Responsibilities

- API routes for journal entries (`app/api/entries/`)
- Prisma schema and migrations (`prisma/`)
- AES-256 encryption utilities (`lib/crypto.ts`)
- Database client setup (`lib/db.ts`)

## Encryption Rules

- Entries are encrypted **client-side** before being sent to the API
- The API receives and stores only ciphertext — never plaintext
- `lib/crypto.ts` exposes: `encryptEntry(plaintext, key)`, `decryptEntry(ciphertext, key)`, `deriveKey(masterPassword, salt)`
- Key derivation: PBKDF2 with SHA-256, 100,000 iterations
- Never log, return, or expose plaintext entry content from any API route

## API Route Contracts

### `POST /api/entries`
- Body: `{ ciphertext: string, iv: string, salt: string, moodId?: string, title: string }`
- Returns: `{ id, createdAt }`

### `GET /api/entries`
- Returns: `{ entries: [{ id, title, createdAt, moodId }] }` — no ciphertext in list view

### `GET /api/entries/[id]`
- Returns: `{ id, ciphertext, iv, salt, title, createdAt, mood }`

### `DELETE /api/entries/[id]`
- Hard deletes the entry

## After Every Change

Run `npm run build` to verify no type errors before marking task complete.
