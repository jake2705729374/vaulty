# Vaultly Wiki Index

Content catalog — updated on every ingest or significant wiki change.

---

## Overview

- [[overview]] — High-level synthesis of Vaultly: what it is, why it exists, core design philosophy

---

## Concepts

- [[encryption-architecture]] — AES-GCM client-side encryption, PBKDF2 key derivation, per-entry salt/IV
- [[ai-therapist-design]] — Claude-powered therapist: chat, reflection, mood insights; tone and model strategy
- [[sub-agent-architecture]] — How Claude Code sub-agents are scoped and orchestrated for Vaultly development

---

## Decisions

- [[adr-client-side-encryption]] — Why encryption happens client-side; server never sees plaintext
- [[adr-aes-gcm-scheme]] — Why AES-GCM 256 with PBKDF2-SHA256 (100k iterations) per-entry salt+IV
- [[adr-nextjs-app-router]] — Why Next.js App Router over Pages Router or other frameworks
- [[adr-supabase-prisma]] — Why Supabase + Prisma over other database options
- [[adr-nextauth-credentials]] — Why NextAuth.js credentials provider; trade-offs vs OAuth
- [[adr-ai-model-selection]] — Model choices: Haiku for chat, Opus for reflection and insights
- [[adr-tiptap-editor]] — Why Tiptap over Quill, Slate, or plain textarea
- [[adr-pi-backups]] — Why Raspberry Pi for backups; shell-only, no Node.js

---

## Sources

*(empty — add sources to `raw/` and run ingest)*
