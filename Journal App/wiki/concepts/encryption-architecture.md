---
title: Encryption Architecture
type: concept
tags: [encryption, aes-gcm, pbkdf2, security, crypto]
created: 2026-04-20
updated: 2026-04-20
related: [[adr-client-side-encryption]], [[adr-aes-gcm-scheme]], [[overview]]
---

# Encryption Architecture

## Overview

Vaultly uses end-to-end client-side encryption. The server is blind to all entry content — it stores only encrypted blobs. The entire crypto implementation lives in `lib/crypto.ts`.

## Key Derivation Flow

```
master password (sessionStorage)
        ↓
  PBKDF2-SHA256
  100,000 iterations
  per-entry random salt (16 bytes)
        ↓
  AES-GCM 256-bit key
```

A fresh salt is generated for every entry save. This means each entry is encrypted with a distinct derived key — the same password produces a different key for each entry.

## Encryption Flow (per entry save)

```
1. Generate random salt (16 bytes) via crypto.getRandomValues()
2. Generate random IV (12 bytes) via crypto.getRandomValues()
3. Derive AES key: PBKDF2(masterPassword, salt, 100000, SHA-256, 256)
4. Encrypt: AES-GCM(plaintext, key, iv)
5. Store: { ciphertext (base64), iv (base64), salt (base64) }
```

## Decryption Flow (per entry load)

```
1. Retrieve { ciphertext, iv, salt } from database
2. Re-derive AES key: PBKDF2(masterPassword, salt, 100000, SHA-256, 256)
3. Decrypt: AES-GCM(ciphertext, key, iv)
4. Return plaintext
```

## Session Storage

The master password is stored in `sessionStorage` (not `localStorage`) after login. It is cleared automatically when the browser tab is closed. It is never sent to the server.

## What the Server Sees

The database stores per entry:
- `title` — **plaintext** (intentional — used for dashboard listing)
- `ciphertext` — AES-GCM encrypted entry body (base64)
- `iv` — 12-byte initialization vector (base64)
- `salt` — 16-byte KDF salt (base64)

Entry titles are the only plaintext content on the server. This is an accepted trade-off for usability.

## AI Feature Implication

When the AI Therapist reads an entry for reflection, the entry is decrypted client-side, then sent to the Anthropic API. The Claude API call carries plaintext. This is an inherent limitation of using a cloud AI on encrypted content — the user accepts this when they use the AI features. See [[ai-therapist-design]].

## Search Limitation

Because content is encrypted server-side, full-text search must happen client-side: decrypt all entries in the browser, then search the plaintext. This is feasible for personal journal scale (hundreds of entries) but would not scale to thousands.
