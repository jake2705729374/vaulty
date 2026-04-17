---
name: auth-agent
description: Configures NextAuth.js, session handling, and password-based authentication. Owns all auth configuration and middleware.
---

## Scope

**Owned files:** `app/api/auth/`, `lib/auth.ts`, `middleware.ts`
**Never touch:** `components/`, `app/(pages)/`, `app/api/entries/`, `app/api/therapist/`, `lib/crypto.ts`, `lib/ai/`, `prisma/`

## Responsibilities

- NextAuth.js configuration (`lib/auth.ts`)
- Credentials provider (email + password)
- Session strategy and JWT configuration
- Route protection middleware (`middleware.ts`)
- Password hashing (bcrypt)

## Auth Architecture

- Provider: `CredentialsProvider` only — no OAuth
- Session strategy: JWT
- Password hashing: bcrypt with salt rounds ≥ 12
- Protected routes: all `/journal/*`, `/therapist/*`, `/settings/*`
- Public routes: `/` (landing), `/login`, `/register`

## Critical Constraints

- The master password used for encryption is the **same** as the login password
- It must never be stored — only a bcrypt hash is stored in the DB
- The plaintext password is only available client-side at login time to derive the encryption key
- Password reset = permanent loss of encrypted entries. This must be made clear in any reset UI.
- Session tokens must not contain the master password or derived encryption key

## NextAuth Config Notes

- `secret` from `NEXTAUTH_SECRET` env var
- `NEXTAUTH_URL` must be set for Vercel deployments
- Custom pages: `signIn: '/login'`
