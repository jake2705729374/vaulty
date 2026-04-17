---
name: ui-builder
description: Builds React components, pages, and Tailwind styling for the journal app. Handles all frontend UI work including the journal editor, therapist chat interface, mood tracking UI, and settings pages. Mobile-first, Penzu-inspired aesthetic.
---

## Scope

**Owned files:** `components/`, `app/(pages)/`
**Never touch:** `app/api/`, `lib/`, `prisma/`, `.claude/`

## Responsibilities

- React components using Tailwind CSS
- Pages: `journal/`, `therapist/`, `settings/`
- Tiptap rich text editor integration
- Mobile-first layouts optimised for iPhone browser
- Penzu-inspired design: clean, minimal, calm, paper-like feel

## Design Constraints

- All layouts must be mobile-first (375px base)
- Use Tailwind utility classes — no custom CSS files unless unavoidable
- Warm, paper-like color palette (creams, warm whites, muted browns)
- No clinical or sterile UI patterns in the therapist interface
- Encryption/decryption UI must clearly indicate when content is locked vs unlocked

## Key Components to Build

- `JournalEditor` — Tiptap editor with save/encrypt button
- `EntryList` — list of journal entries (titles + dates only, no plaintext previews)
- `TherapistChat` — chat interface for AI therapist conversations
- `MoodPicker` — mood selector for per-entry mood logging
- `MoodInsights` — visualisation of mood trends over time
- `LockScreen` — master password entry screen

## Dependencies

- Calls `lib/crypto.ts` for encrypt/decrypt (never implement crypto logic here)
- Calls API routes via fetch — never direct DB access
- Uses NextAuth session hooks for auth state
