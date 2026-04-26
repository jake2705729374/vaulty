---
title: ADR — AI Model Selection
type: decision
tags: [ai, claude, models, anthropic]
created: 2026-04-20
updated: 2026-04-20
related: [[ai-therapist-design]], [[overview]]
---

# ADR — AI Model Selection

## Context

Vaultly's AI Therapist has three distinct features with different latency, quality, and cost requirements: streaming chat, per-entry reflection, and monthly mood insights. Each needed a model calibrated to its use case.

## Decision

| Feature | Model | Reason |
|---------|-------|--------|
| Therapist chat | `claude-haiku-4-5-20251001` | Low latency for streaming; conversational quality sufficient |
| Per-entry reflection | `claude-opus-4-6` with extended thinking | High-quality empathetic response; user waits after saving — latency acceptable |
| Mood insights (90-day) | `claude-opus-4-6` with extended thinking | Complex multi-entry synthesis; run infrequently; quality over speed |

## Rationale

- Chat requires sub-second token streaming to feel responsive — Haiku is the fastest Claude model
- Reflection is a one-shot response after entry save; the user is already in a "done writing" mode and can wait 3-5s for a thoughtful Opus response
- Mood insights analyze up to 90 days of mood logs; extended thinking enables genuine synthesis rather than superficial pattern-matching
- All routes use system prompt caching (`cache_control: ephemeral`) to reduce cost on repeated calls with the same system prompt

## Alternatives Considered

- **Sonnet for chat:** Better quality than Haiku but higher latency for streaming; Haiku quality is sufficient for conversational journaling prompts
- **Haiku for reflection:** Faster but noticeably lower empathy quality on test prompts — Opus reflection felt meaningfully better
- **Single model for all:** Simpler code but either over-spends on chat or under-delivers on insights

## Consequences

- Opus calls are significantly more expensive — mood insights should be rate-limited or triggered manually rather than auto-run
- Model IDs must be updated when Anthropic deprecates versions — pin to specific model IDs, not aliases
- Extended thinking adds latency to reflection and insights routes; UI must show loading state

## Status

Accepted
