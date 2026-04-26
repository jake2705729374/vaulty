---
title: ADR — Supabase + Prisma
type: decision
tags: [database, supabase, prisma, postgresql]
created: 2026-04-20
updated: 2026-04-20
related: [[adr-nextjs-app-router]], [[adr-pi-backups]], [[overview]]
---

# ADR — Supabase + Prisma

## Context

Vaultly needed a managed PostgreSQL host and a type-safe ORM for Next.js. The database stores only encrypted blobs — no plaintext — so query complexity is low, but reliability and ease of backup matter.

## Decision

Use Supabase for managed PostgreSQL hosting and Prisma as the ORM.

## Rationale

- Supabase provides managed PostgreSQL with a generous free tier, direct connection strings, and a built-in Postgres dashboard
- Prisma gives a type-safe query layer with auto-generated TypeScript types from the schema — reduces runtime errors at DB boundaries
- Prisma Migrate handles schema evolution cleanly with version-controlled migration files
- Supabase's backup and point-in-time recovery augments (but does not replace) the Pi backup strategy
- The combination is well-documented and widely used in the Next.js ecosystem

## Alternatives Considered

- **PlanetScale:** MySQL-based, no foreign key support — incompatible with the relational schema (Entry → EntryMedia, User → cascade deletes)
- **Neon:** Strong option; Supabase chosen for dashboard familiarity
- **Drizzle ORM:** Lighter than Prisma but less mature at time of decision; Prisma's type generation is more complete

## Consequences

- Prisma Client must be instantiated as a singleton in `lib/db.ts` to avoid connection pool exhaustion in serverless (Next.js on Vercel)
- Schema changes require `npx prisma migrate dev` — must be run before deploying backend changes
- Supabase connection string is an environment variable; never hardcoded

## Status

Accepted
