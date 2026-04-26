---
title: ADR — Raspberry Pi Backup Strategy
type: decision
tags: [backup, raspberry-pi, self-hosted]
created: 2026-04-20
updated: 2026-04-20
related: [[adr-supabase-prisma]], [[overview]]
---

# ADR — Raspberry Pi Backup Strategy

## Context

Vaultly stores irreplaceable personal journal entries. A single cloud provider (Supabase) is a single point of failure. A self-hosted backup adds resilience without adding operational complexity to the app itself.

## Decision

A Raspberry Pi pulls a nightly encrypted backup via shell scripts and cron. No Node.js on the Pi — shell only.

## Rationale

- Encrypted blobs can be safely stored anywhere — the Pi backup is still encrypted, so physical Pi compromise does not expose journal content
- Shell scripts + cron are reliable, dependency-free, and run indefinitely without maintenance
- Pi is always-on, low power, on a home network — no cloud egress cost for backup storage
- Keeping Pi scripts shell-only (no Node.js) means zero runtime dependencies to maintain on the Pi side
- Separation of concerns: the Pi backup agent is scoped strictly to `pi/` shell scripts; it never touches app code

## Consequences

- Backup scripts are defined as a sub-agent scope but not yet implemented (known gap as of 2026-04-20)
- Pi must have SSH access to Supabase or a Vaultly export endpoint — the export route at `/api/entries/export` exists but format is not finalized
- No automated restore procedure exists yet — recovery is manual

## Status

Accepted — implementation pending
