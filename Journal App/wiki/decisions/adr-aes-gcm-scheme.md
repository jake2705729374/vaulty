---
title: ADR — AES-GCM Encryption Scheme
type: decision
tags: [encryption, aes-gcm, pbkdf2, security]
created: 2026-04-20
updated: 2026-04-20
related: [[adr-client-side-encryption]], [[encryption-architecture]]
---

# ADR — AES-GCM 256 with PBKDF2-SHA256

## Context

Given the decision to encrypt client-side, a specific cipher suite and key derivation function had to be chosen. The scheme needed to be: available natively in Web Crypto API, resistant to brute force, and produce no repeated ciphertexts across entries.

## Decision

- **Cipher:** AES-GCM 256-bit
- **KDF:** PBKDF2-SHA256, 100,000 iterations
- **Per-entry:** random 16-byte salt + random 12-byte IV, generated fresh for every entry save

## Rationale

- AES-GCM provides authenticated encryption — it detects tampering (unlike AES-CBC)
- 256-bit key is future-proof against advances in brute force
- PBKDF2 with 100k iterations is the OWASP-recommended minimum for password-based key derivation as of 2024
- Per-entry salt means each entry is encrypted with a distinct derived key — compromise of one entry's key does not affect others
- Per-entry IV prevents ciphertext comparison attacks across entries with the same content
- All primitives are available via `window.crypto.subtle` — no external dependencies

## Alternatives Considered

- **ChaCha20-Poly1305:** Excellent cipher but less universally supported in Web Crypto API across older iOS Safari versions
- **Argon2id:** Stronger KDF but not available in Web Crypto API; would require a WASM library
- **Shared salt:** Simpler but means all entries share a key — single compromise is total compromise

## Consequences

- Entry storage schema must include `{ ciphertext, iv, salt }` per entry (not just ciphertext)
- Key derivation runs on every login (~500ms) and every entry decrypt
- No server-side index on entry content is possible

## Status

Accepted
