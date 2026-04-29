# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal, private journal web app inspired by Penzu. Built with Next.js and accessed via mobile browser on iPhone. All journal entries are AES-256 encrypted and backed up to a self-hosted Raspberry Pi. An AI Therapist feature provides reflective support, mood tracking, and journaling prompts.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Hosting | Vercel (app) + Raspberry Pi (backups) |
| Database | PostgreSQL (Supabase or self-hosted) |
| ORM | Prisma |
| Encryption | AES-256 (per-entry, client-side key derived from master password) |
| Auth | NextAuth.js — email + password login |
| AI | Claude API (Anthropic) |
| Styling | Tailwind CSS |
| Rich Text | Tiptap editor |
| Backup | Shell scripts + cron jobs on Raspberry Pi |

---

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build (run after every backend change)
npm test          # Run test suite
npx prisma studio         # Open Prisma DB GUI

# Schema changes — ALWAYS use migrate, never db push
npx prisma migrate dev --name <description>   # Create + apply a new migration (dev only)
npx prisma migrate deploy                     # Apply pending migrations (runs automatically in build)
```

---

## Authentication & Encryption

- Users log in with **email + password**
- Each journal entry is **separately AES-256 encrypted** using a key derived from the master password
- Encryption/decryption happens **client-side** — the server never sees plaintext entries (`lib/crypto.ts`)
- Password reset must be handled carefully: losing the master password means losing entry access

---

## AI Therapist Feature

The AI Therapist uses the Claude API (`lib/ai/`, `app/api/therapist/`) and supports:

- **Chat-based journaling prompts** — Claude asks thoughtful questions to help the user reflect
- **Mood tracking & insights** — mood is logged per entry; Claude surfaces patterns over time
- **Reflective responses to entries** — after saving an entry, Claude responds with a brief, empathetic reflection

Tone: calm, non-judgmental, supportive. Never clinical or robotic. Never give medical advice or act as a substitute for professional mental health care.

---

## Agent Architecture

Sub-agents live in `.claude/agents/` and have strictly scoped file domains:

| Agent | Scope | Files |
|---|---|---|
| UI Builder | React components, Tailwind, pages | `components/`, `app/(pages)/` |
| Backend Engineer | API routes, Prisma, encryption logic | `app/api/`, `lib/`, `prisma/` |
| Auth Agent | NextAuth config, session handling | `app/api/auth/`, `lib/auth.ts` |
| AI Therapist Agent | Claude API integration, prompt engineering | `lib/ai/`, `app/api/therapist/` |
| Test Runner | Build checks, unit + integration tests | runs after other agents complete |
| Pi Backup Agent | Shell scripts, cron configs | Pi-side only, no JS files |

**Orchestration loop:** dispatch to sub-agent(s) → Test Runner runs `npm run build` + `npm test` → if errors, pass full error log back to originating agent → repeat until tests pass.

---

## Directory Structure

```
/
├── app/
│   ├── (pages)/
│   │   ├── journal/
│   │   ├── therapist/
│   │   └── settings/
│   └── api/
│       ├── auth/
│       ├── entries/
│       └── therapist/
├── components/
├── lib/
│   ├── ai/
│   ├── auth.ts
│   ├── crypto.ts
│   └── db.ts
├── prisma/
│   └── schema.prisma
└── .claude/
    └── agents/
        ├── ui-builder.md
        ├── backend-engineer.md
        ├── auth-agent.md
        ├── ai-therapist-agent.md
        ├── test-runner.md
        └── pi-backup-agent.md
```

---

## Key Constraints

- Never store plaintext journal entries in the database
- Never touch files outside a sub-agent's defined scope
- Always run `npm run build` after backend changes
- Pi backup scripts are shell-only — no Node.js on the Pi side
- Mobile-first — optimised for iPhone browser

---

## Knowledge Wiki

A persistent LLM-maintained wiki lives in `Journal App/` (the Obsidian vault at the repo root).

**Read before working on:**
- Encryption changes → `Journal App/wiki/concepts/encryption-architecture.md`
- AI/therapist changes → `Journal App/wiki/concepts/ai-therapist-design.md`
- Any architectural question → `Journal App/wiki/overview.md`
- Decision rationale → `Journal App/wiki/decisions/`

**Update after working:**
After making any significant architectural change or decision, before closing the task:
1. Update or create the relevant page in `Journal App/wiki/concepts/` or `Journal App/wiki/decisions/`
2. Update `Journal App/index.md` if a new page was created
3. Append an entry to `Journal App/log.md` with format `## [YYYY-MM-DD] update | description`

See `Journal App/CLAUDE.md` for the full wiki schema and workflows.
