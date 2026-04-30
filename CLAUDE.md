# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vaultly — a personal, private journal web app. Mobile-first (iPhone), used daily. All journal entries are AES-256 encrypted client-side; the server never sees plaintext. An AI Coach provides reflective support, mood tracking, journaling prompts, and a live split-pane panel inside the editor.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Turbopack in dev |
| Hosting | Vercel | Auto-deploy via GitHub Actions CI |
| Database | PostgreSQL (Supabase) | Prisma ORM |
| Object Storage | Supabase Storage | Photos/videos — `entry-media` bucket |
| Encryption | AES-256-GCM, client-side | MEK envelope pattern — see Encryption section |
| Auth | NextAuth.js v5 | Email + password |
| AI | Claude API (Anthropic) | claude-haiku-4-5 for chat/coach; `lib/ai/` |
| Styling | Tailwind CSS v4 | Custom CSS variables for themes |
| Rich Text | Tiptap | Tiptap StarterKit |
| Error Monitoring | Sentry (`@sentry/nextjs` v10) | `sentry.*.config.ts` + `instrumentation.ts` |
| Analytics | Vercel Analytics + Speed Insights | Custom events via `lib/analytics.ts` |
| Validation | Zod v4 | `lib/validation.ts` — schemas + `parseBody()` helper |
| Rate Limiting | Upstash Redis (`@upstash/ratelimit`) | `lib/rate-limit.ts` |
| Email | Resend | Verification, password reset, weekly digest |
| Testing | Vitest | `__tests__/lib/` — crypto + password-strength |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` |
| Backup | Shell scripts + cron on Raspberry Pi | Pi-side only |

---

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # prisma generate + next build (run after every change)
npm test             # Vitest — crypto and password-strength unit tests
npm run test:watch   # Vitest watch mode
npx prisma studio    # Open Prisma DB GUI

# Schema changes — ALWAYS use migrate, never db push
npx prisma migrate dev --name <description>   # Create + apply migration (dev)
npx prisma migrate deploy                     # Apply to production (before git push)
```

---

## Authentication & Encryption

### Login flow
- Email + password; NextAuth v5 session
- Email verification via 6-digit OTP (Resend) on registration
- Password reset via OTP (SHA-256 hashed in DB, 15-min TTL)
- Password strength enforced client + server (`lib/password-strength.ts`)

### Envelope encryption (MEK pattern)
Every journal entry is AES-256-GCM encrypted. The key hierarchy:

```
Master Password
      │  PBKDF2 (600k iterations, SHA-256)
      ▼
Key Encryption Key (KEK)  ──AES-GCM wrap──▶  encryptedMek + mekIv + kekSalt
                                                       (stored in User row)
      │  unwrap on login
      ▼
Master Encryption Key (MEK)  ──AES-GCM──▶  entry ciphertext + iv
                                                  (stored in Entry row)
```

- Changing password only re-wraps the MEK — entries are untouched
- MEK is held in memory only; never persisted in plaintext
- `lib/crypto.ts` contains all crypto primitives; full round-trip tests in `__tests__/lib/crypto.test.ts`

---

## AI Coach Feature

The AI Coach (`lib/ai/`, `app/api/coach/`) replaces the earlier "Therapist" branding. The `/therapist` route redirects to `/coach`.

### Capabilities
- **Standalone chat** — `/coach` page with persistent sessions sidebar, grouped by date
- **In-editor split pane** — `CoachPanel` component embedded in `JournalEditor`; desktop shows side-by-side, mobile shows as a tab
- **Live entry context** — editor passes live text to the panel; coach sees what the user is writing
- **Recent entries context** — optional privacy toggle; client decrypts last 10 entries and sends plaintext to Anthropic (disclosed to user)
- **Coach profile** — people (name, relationship, birthday, closeness, traits), life phase, current situations; stored as JSON in `UserPreferences`
- **Session auto-naming** — after 4 messages (2nd exchange), `POST /api/coach/sessions/[id]/generate-title` calls claude-haiku to generate a 4-7 word specific title; updates sidebar optimistically
- **Memories** — coach insights can be saved to `Memory` table; displayed in settings
- **Session summaries** — stored in `SessionSummary` table

### Coach prompt caching
`lib/ai/prompts.ts` exports `COACH_BASE_PROMPT` (stable, marked `cache_control: ephemeral`) and user-context blocks (not cached). This pattern maximises Anthropic prompt cache hits.

### Safety
`POST /api/coach/safety` does a regex fast-path + AI check before responding. Crisis language triggers a redirect to professional resources.

---

## Media Storage

Photos and videos are stored in **Supabase Storage** (bucket: `entry-media`), not in Postgres.

- `lib/storage.ts` — `uploadMedia(arrayBuffer, fileName, userId, mediaId)`, `getSignedUrls(paths[])`, and `deleteMedia(storageUrl)` using the Supabase Storage REST API
- Storage path: `{userId}/{mediaId}-{sanitisedFileName}` (bare path, not a full URL)
- **Private bucket** — files require short-lived signed URLs (1-hour TTL via `getSignedUrls`); files are also AES-256-GCM encrypted client-side before upload (double protection)
- `EntryMedia.storageUrl` stores the **bare storage path** (not a full CDN URL); `EntryMedia.mediaIv` stores the base64 AES-GCM IV (`null` for legacy unencrypted files)
- `JournalEditor` uses `item.blobUrl` for instant post-upload preview; on reload it fetches the signed URL and decrypts in-browser using the MEK, storing a `blobUrl` for display

**Required env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Weekly Digest

`GET /api/digest/weekly` — two callers:

1. **Vercel Cron** (daily 09:00 UTC, configured in `vercel.json`) — processes all opted-in users. Authenticated via `Authorization: Bearer <CRON_SECRET>`.
2. **Client dashboard load** — processes only the current user via NextAuth session. No-ops if last digest was < 6 days ago.

Digest content: entry titles + moods from the past 7 days, saved memories, session summaries. Claude generates a reflective summary; Resend delivers it.

**Required env var:** `CRON_SECRET`

---

## Analytics

`lib/analytics.ts` wraps `@vercel/analytics` `track()` with a typed event catalogue. Import and call anywhere on the client:

```ts
import { track } from "@/lib/analytics"
track("coach_panel_opened", { device: "desktop" })
```

**Instrumented events:**
- `onboarding_step_viewed` · `onboarding_completed`
- `entry_saved` (type, word_count)
- `coach_panel_opened` (device) · `coach_message_sent` · `coach_insert_to_entry`
- `media_uploaded` (media_type)
- `settings_goal_toggled` · `settings_theme_changed` · `settings_ai_entries_toggled` · `settings_coach_style_changed`

Vercel Speed Insights (Web Vitals) is also wired in `app/layout.tsx`.

---

## Validation

`lib/validation.ts` exports Zod schemas and a `parseBody()` helper used by all API routes that accept JSON:

```ts
const parsed = parseBody(await req.text(), EntryBodySchema, MAX_ENTRY_BODY_BYTES)
if (parsed.error) return parsed.error
```

Key schemas: `EntryBodySchema` (ciphertext base64, mood enum), `HabitBodySchema`, `RegisterSchema`.
Size limits: `MAX_ENTRY_BODY_BYTES` = 2 MB for entries, `MAX_BODY_BYTES` = 64 KB for everything else.

---

## Error Monitoring (Sentry)

- `sentry.client.config.ts` — browser: session replay (maskAllText), `beforeSend` strips request body
- `sentry.server.config.ts` — Node: `beforeSend` strips body + auth/cookie headers
- `sentry.edge.config.ts` — minimal edge runtime init
- `instrumentation.ts` — registers server/edge configs via `NEXT_RUNTIME`
- `app/error.tsx` + `app/global-error.tsx` — call `Sentry.captureException(error)`
- Source maps uploaded to Sentry at build time; deleted from deploy output

**Required env vars:** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

---

## CI/CD

`.github/workflows/ci.yml` — two jobs:

| Job | Trigger | Steps |
|---|---|---|
| `check` | Every push + every PR to `main` | `npm ci` → lint → `npm test` → `npm run build` |
| `deploy` | Push to `main` only (after `check` passes) | `vercel deploy --prod` |

CI uses placeholder env vars so `next build` compiles without a real DB connection. **Add `VERCEL_TOKEN` to GitHub repo Secrets** for the deploy job to work.

---

## Testing

```bash
npm test          # Run all tests once
npm run test:watch  # Watch mode
```

Test files live in `__tests__/lib/`:
- `crypto.test.ts` — 40 tests covering generateSalt, encryptEntry/decryptEntry (legacy), encryptWithMek/decryptWithMek (MEK path), encryptMek/decryptMek (key wrapping), createKeyBundle/unlockMek, rewrapMek, migration (legacy→MEK), wrong-key rejection, tamper detection
- `password-strength.test.ts` — 18 tests covering score 0-4, individual requirements, common password detection (case-insensitive), labels, colors, `validatePasswordServer` boundary cases

Vitest config: `vitest.config.ts` — Node environment (no browser/jsdom), 15s timeout for PBKDF2 ops.

---

## PWA / Mobile

The app is installable as a PWA (Add to Home Screen on iOS):

- `app/manifest.ts` — `display: standalone`, `start_url: /dashboard`, `theme_color: #7c6ef2`, `orientation: portrait`
- `app/icon.tsx` — generates `/icon.png` (512×512) via Next.js `ImageResponse`
- `app/apple-icon.tsx` — generates `/apple-icon.png` (180×180) for iOS home screen
- `app/layout.tsx` — `appleWebApp: { capable: true, statusBarStyle: "black-translucent" }`, `themeColor` in viewport

---

## SEO

- `app/robots.ts` — allows `/`, `/privacy`, `/terms`; blocks all auth/app/api paths
- `app/sitemap.ts` — indexes `/`, `/privacy`, `/terms`

---

## Key Features Summary

| Feature | Location |
|---|---|
| Journal editor | `components/JournalEditor.tsx` |
| AI Coach panel (in-editor) | `components/CoachPanel.tsx` |
| Standalone coach chat | `app/(pages)/(protected)/coach/page.tsx` |
| Habits tracker | `app/(pages)/(protected)/habits/page.tsx`, `app/api/habits/` |
| Mood calendar | `app/api/mood/calendar/route.ts` |
| Onboarding (8 steps) | `app/(pages)/(protected)/onboarding/page.tsx` |
| Settings | `app/(pages)/(protected)/settings/page.tsx` |
| Dashboard | `app/(pages)/(protected)/dashboard/page.tsx` |
| Weekly digest | `app/api/digest/weekly/route.ts` |
| Media upload/serve | `app/api/entries/[id]/media/` |
| Voice dictation | `app/api/transcribe/route.ts` (OpenAI Whisper) |
| Grammar check | `app/api/grammar/route.ts` |
| Bulk entry delete | `app/api/entries/bulk-delete/route.ts` |
| Entry export | `app/api/entries/export/route.ts` |

---

## Directory Structure

```
/
├── app/
│   ├── (pages)/
│   │   ├── (protected)/          # All require auth (middleware)
│   │   │   ├── coach/
│   │   │   ├── dashboard/
│   │   │   ├── habits/
│   │   │   ├── journal/
│   │   │   │   └── [id]/
│   │   │   ├── onboarding/
│   │   │   ├── settings/
│   │   │   └── therapist/        # Redirects → /coach
│   │   ├── login/
│   │   ├── register/
│   │   ├── privacy/
│   │   └── terms/
│   ├── api/
│   │   ├── auth/                 # register, login, verify, reset-password, logout
│   │   ├── coach/                # chat, safety, extract, retrieve, sessions/, sessions/[id]/
│   │   │   └── sessions/[id]/
│   │   │       ├── messages/
│   │   │       └── generate-title/
│   │   ├── digest/weekly/
│   │   ├── entries/              # CRUD, bulk-delete, export, recent
│   │   │   └── [id]/
│   │   │       ├── chat/
│   │   │       └── media/
│   │   │           └── [mediaId]/
│   │   ├── grammar/
│   │   ├── habits/
│   │   │   └── [id]/logs/
│   │   ├── memories/
│   │   ├── mood/calendar/
│   │   ├── prompts/daily/
│   │   ├── session-summary/
│   │   ├── therapist/            # Legacy routes kept for compatibility
│   │   ├── transcribe/
│   │   └── user/                 # profile, preferences, password, key-bundle, migrate-keys
│   ├── apple-icon.tsx            # PWA apple touch icon (Next.js ImageResponse)
│   ├── icon.tsx                  # PWA app icon (Next.js ImageResponse)
│   ├── layout.tsx                # Root layout: fonts, Analytics, SpeedInsights
│   ├── manifest.ts               # PWA manifest
│   ├── robots.ts                 # robots.txt
│   └── sitemap.ts                # sitemap.xml
├── components/
│   ├── CoachPanel.tsx
│   ├── JournalEditor.tsx
│   ├── HabitsPanel.tsx
│   ├── LockScreen.tsx
│   ├── EntryList.tsx
│   └── ...
├── lib/
│   ├── ai/
│   │   ├── claude.ts             # Anthropic client singleton
│   │   └── prompts.ts            # System prompts (COACH_BASE_PROMPT etc.)
│   ├── analytics.ts              # Typed track() wrapper for Vercel Analytics
│   ├── auth.ts                   # NextAuth config
│   ├── crypto.ts                 # AES-256-GCM encryption primitives
│   ├── db.ts                     # Prisma client singleton
│   ├── email.ts                  # Resend email helpers
│   ├── password-strength.ts      # Password scoring + validation
│   ├── rate-limit.ts             # Upstash Redis rate limiter
│   ├── storage.ts                # Supabase Storage upload/delete
│   ├── streak.ts                 # Journaling streak calculator
│   ├── utils.ts                  # Shared utilities
│   └── validation.ts             # Zod schemas + parseBody() helper
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── 20260428000000_init/
│       └── 20260429000000_media_object_storage/
├── __tests__/
│   └── lib/
│       ├── crypto.test.ts
│       └── password-strength.test.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── sentry.client.config.ts
├── sentry.server.config.ts
├── sentry.edge.config.ts
├── instrumentation.ts
├── vercel.json                   # Function config + cron schedule
└── vitest.config.ts
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string (direct port 5432) |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | NextAuth session signing |
| `NEXTAUTH_URL` | App base URL |
| `ANTHROPIC_API_KEY` | Claude API |
| `OPENAI_API_KEY` | Whisper transcription |
| `RESEND_API_KEY` | Transactional email |
| `RESEND_FROM` | Sender address |
| `UPSTASH_REDIS_REST_URL` | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry (safe to expose) |
| `SENTRY_AUTH_TOKEN` | Sentry source map upload (secret) |
| `SENTRY_ORG` | Sentry org slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `SUPABASE_URL` | Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Storage uploads (secret) |
| `CRON_SECRET` | Weekly digest cron authentication |

---

## Key Constraints

- **Never store plaintext journal entries in the database** — ciphertext only
- **Never read `EntryMedia.data`** — that column was dropped; use `storageUrl`
- **Always run `npm run build` after backend changes** — catches TypeScript errors before deploy
- **Always use `parseBody()` from `lib/validation.ts`** for API routes that accept JSON — enforces size limits + Zod validation
- **All API routes that modify data must verify session ownership** — never trust IDs from the request body alone
- **Pi backup scripts are shell-only** — no Node.js on the Pi side
- **Mobile-first** — optimised for iPhone Safari; test layout at 390px width
