---
title: ADR — Next.js App Router
type: decision
tags: [nextjs, framework, architecture]
created: 2026-04-20
updated: 2026-04-20
related: [[adr-supabase-prisma]], [[overview]]
---

# ADR — Next.js App Router

## Context

Vaultly needed a React-based framework that supports server components, API routes, and easy Vercel deployment. The choice between App Router and Pages Router was non-trivial at the time of the decision.

## Decision

Use Next.js 16 with the App Router (not Pages Router).

## Rationale

- App Router is the current Next.js default and the direction of all new investment from Vercel
- React Server Components reduce client bundle size for non-interactive pages (dashboard, settings)
- Nested layouts enable the persistent sidebar/navigation pattern without prop drilling
- API routes (`app/api/`) co-locate backend logic with the frontend in one repo
- Vercel deployment is zero-config for Next.js

## Consequences

- Server Components and Client Components must be deliberately chosen — `"use client"` boundary matters especially for Web Crypto API calls (crypto only runs in Client Components)
- App Router caching behavior is more complex than Pages Router — requires awareness of `cache`, `revalidate`, and fetch behavior
- All AI streaming (SSE) routes must be carefully configured with `dynamic = "force-dynamic"`

## Status

Accepted
