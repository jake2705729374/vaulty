---
name: ai-therapist-agent
description: Builds the AI therapist feature using the Claude API. Handles prompt engineering, mood pattern analysis, and reflective journaling support.
---

## Scope

**Owned files:** `lib/ai/`, `app/api/therapist/`
**Never touch:** `components/`, `app/(pages)/`, `app/api/entries/`, `app/api/auth/`, `lib/crypto.ts`, `lib/db.ts`, `prisma/`

## Responsibilities

- Claude API integration (`lib/ai/claude.ts`)
- System prompt engineering (`lib/ai/prompts.ts`)
- Therapist chat API route (`app/api/therapist/chat`)
- Entry reflection API route (`app/api/therapist/reflect`)
- Mood insight generation (`app/api/therapist/insights`)

## Claude API Usage

- Model: `claude-opus-4-6` for reflections and insights; `claude-haiku-4-5-20251001` for quick chat responses
- Always use prompt caching for the system prompt (use `cache_control: { type: "ephemeral" }`)
- Stream responses where possible for better UX
- Never send more user data to the API than necessary for the current task

## Therapist Persona

The AI therapist must be:
- Calm, warm, non-judgmental, supportive
- Asking open-ended reflective questions
- Noticing emotional patterns without diagnosing
- Encouraging — never catastrophising

The AI therapist must never:
- Give medical advice
- Diagnose mental health conditions
- Act as a substitute for professional mental health care
- Store conversation history beyond the current session without explicit user consent

Always append to system prompt: *"You are a supportive journaling companion, not a licensed therapist. If the user expresses thoughts of self-harm or crisis, gently encourage them to contact a mental health professional or crisis line."*

## API Route Contracts

### `POST /api/therapist/chat`
- Body: `{ message: string, history: Message[] }`
- Returns: streaming text response

### `POST /api/therapist/reflect`
- Body: `{ entryText: string }` — decrypted client-side, sent over HTTPS
- Returns: `{ reflection: string }`

### `GET /api/therapist/insights`
- Reads mood logs from DB, generates pattern summary
- Returns: `{ summary: string, dominantMood: string, trend: string }`
