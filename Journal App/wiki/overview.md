---
title: Vaultly Overview
type: overview
tags: [vaultly, overview, architecture]
created: 2026-04-20
updated: 2026-04-20
related: [[encryption-architecture]], [[ai-therapist-design]], [[sub-agent-architecture]]
---

# Vaultly Overview

## What It Is

Vaultly is a privacy-first, AI-powered personal journal web app. Inspired by Penzu. Built for iPhone browser access via Vercel. Entries are AES-256 encrypted client-side and backed up nightly to a self-hosted Raspberry Pi.

## Core Design Philosophy

**Privacy above all.** The server never sees plaintext journal entries. Encryption happens in the browser using a key derived from the user's master password. If the master password is lost, the entries are unrecoverable — this is a deliberate trade-off, disclosed to the user.

**AI as a reflective companion, not a replacement.** The Claude-powered AI Therapist asks thoughtful journaling prompts, reflects on entries with empathy, and surfaces mood patterns over time. It is explicitly non-clinical — never gives medical advice, never acts as a substitute for professional care.

**Self-hosted resilience.** Vercel hosts the app; Supabase stores encrypted blobs. A Raspberry Pi pulls a nightly encrypted backup via shell scripts — no Node.js, no dependencies, just reliable cron + SSH.

## Stack at a Glance

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Hosting | Vercel + Raspberry Pi (backups) |
| Database | Supabase PostgreSQL + Prisma |
| Auth | NextAuth.js (credentials, JWT) |
| Encryption | Web Crypto API — AES-GCM 256, PBKDF2-SHA256 |
| Editor | Tiptap (rich text + voice dictation) |
| AI | Anthropic Claude API |
| Styling | Tailwind CSS 4, shadcn/ui, Framer Motion |

## Key Features

- Per-entry AES-GCM encryption (random 16-byte salt, 12-byte IV each entry)
- AI Therapist: streaming chat (Haiku), per-entry reflection (Opus), 90-day mood insights (Opus)
- Voice dictation via browser Speech API + grammar check (LanguageTool)
- Draft auto-recovery (localStorage, 24hr), auto-save (10s debounce)
- Streak tracking, mood logging (GREAT/GOOD/OKAY/LOW/AWFUL), daily motivational quote
- 6 color themes + custom color picker; system/light/dark mode
- Media attachments stored as binary blobs in PostgreSQL

## Known Gaps (as of 2026-04-20)

- No 2FA
- No session invalidation on password change
- Therapist chat is session-only (no conversation history persistence)
- Pi backup scripts defined but not implemented
- Export format (JSON vs CSV) not finalized
- Mood insights require ≥3 entries minimum

## Development Approach

Six scoped Claude Code sub-agents handle distinct layers of the codebase. An orchestration loop ensures the test runner validates every backend change. See [[sub-agent-architecture]] for details.
