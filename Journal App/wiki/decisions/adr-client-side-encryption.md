---
title: ADR — Client-Side Encryption
type: decision
tags: [encryption, privacy, security]
created: 2026-04-20
updated: 2026-04-20
related: [[adr-aes-gcm-scheme]], [[encryption-architecture]]
---

# ADR — Client-Side Encryption

## Context

Vaultly stores deeply personal journal entries. A server-side breach or subpoena should never expose plaintext content. The app needed a trust model where the hosting provider, database provider, and even the developer cannot read entries.

## Decision

All encryption and decryption happens in the browser (Web Crypto API). The server receives only `{ ciphertext, iv, salt }`. The master password never leaves the client after login — it is stored in `sessionStorage` and used client-side to derive the AES key via PBKDF2.

## Rationale

- Server-side encryption still exposes plaintext during processing; client-side eliminates that window entirely
- Web Crypto API is built into modern browsers — no external library dependency, no supply chain risk
- `sessionStorage` (vs `localStorage`) means the key is cleared on tab close, limiting exposure window
- Supabase, Vercel, and any future infrastructure provider become blind to content

## Consequences

- **Password reset = entry loss.** If the master password is lost, there is no recovery path. This is disclosed to the user prominently.
- Key derivation (PBKDF2, 100k iterations) adds ~500ms on login — acceptable for a security-critical path.
- Server-side full-text search is impossible. Future search must be client-side (decrypt → search in browser).
- AI features receive plaintext only transiently on the client before sending to Claude API — the API call itself carries plaintext. See [[ai-therapist-design]] for the privacy implications.

## Status

Accepted
