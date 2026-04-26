---
title: Sub-Agent Architecture
type: concept
tags: [claude-code, agents, development, architecture]
created: 2026-04-20
updated: 2026-04-20
related: [[overview]]
---

# Sub-Agent Architecture

## Overview

Vaultly's development is managed through six scoped Claude Code sub-agents defined in `.claude/agents/`. Each agent has a strict file domain — it cannot touch files outside its scope. This prevents agents from accidentally breaking each other's layers.

## Agent Map

| Agent | File Scope | Responsibility |
|-------|-----------|----------------|
| `ui-builder` | `components/`, `app/(pages)/` | React components, Tailwind, page layouts |
| `backend-engineer` | `app/api/entries/`, `lib/crypto.ts`, `lib/db.ts`, `prisma/` | API routes, Prisma, encryption logic |
| `auth-agent` | `app/api/auth/`, `lib/auth.ts`, `middleware.ts` | NextAuth config, session handling, middleware |
| `ai-therapist-agent` | `lib/ai/`, `app/api/therapist/` | Claude API integration, prompt engineering |
| `test-runner` | read-only all files | Runs `npm run build` + `npm test` after other agents complete |
| `pi-backup-agent` | `pi/` shell scripts only | Raspberry Pi backup scripts; no Node.js |

## Orchestration Loop

```
1. User describes task
2. Orchestrator (main Claude Code) identifies which agent(s) own the relevant files
3. Sub-agent makes changes within its scope
4. Test Runner runs: npm run build && npm test
5. If errors → error log returned to originating sub-agent → agent fixes → repeat
6. If clean → task complete
```

## Why Scoped Agents

- Prevents scope creep: a UI change can't accidentally modify crypto logic
- Matches the mental model of team roles (frontend / backend / auth / AI)
- Failure isolation: a broken backend agent doesn't contaminate the UI layer
- Easier context: each agent loads only the files relevant to its domain

## Wiki Update Convention

When any sub-agent makes a significant architectural change:
1. Check if an existing ADR or concept page in `Journal App/wiki/` needs updating
2. If a new architectural decision was made, create a new ADR in `wiki/decisions/`
3. Update `index.md` and append to `log.md`

This ensures the wiki stays current as a side effect of development work.
