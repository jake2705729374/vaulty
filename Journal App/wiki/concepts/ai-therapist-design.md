---
title: AI Therapist Design
type: concept
tags: [ai, claude, therapist, prompts, mood]
created: 2026-04-20
updated: 2026-04-20
related: [[adr-ai-model-selection]], [[encryption-architecture]], [[overview]]
---

# AI Therapist Design

## Purpose

The AI Therapist is a Claude-powered companion for reflective journaling. It is explicitly non-clinical — it supports, prompts, and reflects. It never diagnoses, never gives medical advice, and never positions itself as a substitute for professional mental health care.

## Three Features

### 1. Therapist Chat (`/therapist`)
- **Model:** `claude-haiku-4-5-20251001`
- **Transport:** Server-Sent Events (SSE) streaming
- **Route:** `app/api/therapist/chat`
- **Behavior:** Asks thoughtful open-ended journaling prompts. Listens. Reflects back what the user shares. Tone: calm, curious, non-judgmental.
- **Limitation:** Session-only — no conversation history persists between sessions (known gap).

### 2. Per-Entry Reflection (`/journal/[id]`)
- **Model:** `claude-opus-4-6` with extended thinking
- **Transport:** Standard JSON response (non-streaming)
- **Route:** `app/api/therapist/reflect`
- **Behavior:** Triggered after the user saves an entry. Claude reads the decrypted entry content and responds with a brief, empathetic reflection — 2-4 sentences. Surfaces themes, validates emotions, may suggest a follow-up question.
- **Input:** Decrypted entry body sent from client after save.

### 3. Mood Insights (`/settings` or dashboard)
- **Model:** `claude-opus-4-6` with extended thinking
- **Route:** `app/api/therapist/insights`
- **Behavior:** Analyzes up to 90 days of mood logs (GREAT/GOOD/OKAY/LOW/AWFUL) and entry titles. Surfaces patterns, trends, and observations. Requires ≥3 entries minimum.
- **Input:** Mood logs + entry titles (not entry bodies — bodies require per-entry decryption, which is expensive at scale).

## Tone Guidelines (from `lib/ai/prompts.ts`)

- Calm, warm, non-judgmental
- Never clinical or robotic
- Ask one question at a time
- Don't offer unsolicited advice
- If user expresses crisis signals, gently suggest professional support resources

## Prompt Caching

System prompts in `lib/ai/prompts.ts` use `cache_control: ephemeral` for Anthropic prompt caching. This reduces cost on repeated API calls that share the same system prompt. Cache TTL is 5 minutes — chat conversations benefit most since they call the same system prompt repeatedly.

## Privacy Note

AI features require sending plaintext to the Anthropic API. Entry bodies are decrypted client-side before being included in API calls. Users implicitly accept this when they trigger AI features. The AI features are opt-in at the feature level (user initiates chat, reflection is triggered post-save). See [[encryption-architecture]] for the full picture.

## Known Gaps

- No conversation history persistence — each chat session starts fresh
- Mood insights use entry titles, not bodies — shallower analysis than possible
- No user feedback loop (thumbs up/down on reflections)
