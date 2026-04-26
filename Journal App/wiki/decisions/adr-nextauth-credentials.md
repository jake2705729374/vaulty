---
title: ADR — NextAuth.js Credentials Provider
type: decision
tags: [auth, nextauth, security]
created: 2026-04-20
updated: 2026-04-20
related: [[adr-client-side-encryption]], [[overview]]
---

# ADR — NextAuth.js Credentials Provider

## Context

Vaultly needed an authentication system compatible with Next.js App Router. The key constraint: the master password must be available client-side after login to derive the AES encryption key — this rules out pure OAuth flows where the app never sees a password.

## Decision

Use NextAuth.js 5.0 with a credentials provider (email + password). Sessions are JWT-based.

## Rationale

- Credentials provider allows custom password validation and, critically, allows the client to hold the master password in `sessionStorage` for crypto key derivation
- NextAuth.js handles session management, CSRF protection, and cookie security out of the box
- JWT sessions avoid a database session table — one less table to maintain, and stateless verification
- Auth config lives in `auth.config.ts` with separate concerns in `lib/auth.ts`

## Alternatives Considered

- **OAuth (Google/GitHub):** Would not give Vaultly access to a password for key derivation. Could use a separate "encryption passphrase" but this degrades UX — two passwords to manage
- **Lucia Auth:** Lighter library but less ecosystem support; NextAuth.js has better Next.js App Router integration
- **Custom JWT:** More control but more security surface to manage; NextAuth.js is audited and maintained

## Consequences

- No OAuth login — users must create a Vaultly-specific account. Higher friction at signup but required for the encryption model.
- Password change is dangerous: changing the master password requires re-encrypting all entries client-side or accepting entry loss. No session invalidation on password change currently (known gap).
- No 2FA currently (known gap).
- JWT sessions mean logout does not truly invalidate a token until it expires — acceptable for a personal app.

## Status

Accepted
