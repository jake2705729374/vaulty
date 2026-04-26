# Vaultly Knowledge Wiki — Schema

This is an LLM-maintained knowledge wiki for the Vaultly journal app. Claude Code writes and maintains all wiki pages. The user curates sources and directs exploration.

---

## Directory Layout

```
Journal App/              ← Obsidian vault root
├── CLAUDE.md             ← this file (wiki schema)
├── index.md              ← content catalog (update on every ingest)
├── log.md                ← append-only chronological record
├── raw/                  ← immutable source documents (never modify)
│   └── assets/           ← locally downloaded images
└── wiki/
    ├── overview.md       ← high-level synthesis of Vaultly
    ├── concepts/         ← architecture patterns, design ideas, techniques
    ├── decisions/        ← architecture decision records (ADRs)
    └── sources/          ← summaries of ingested source documents
```

---

## Conventions

### Page Frontmatter
Every wiki page must have YAML frontmatter:
```yaml
---
title: Page Title
type: concept | decision | source | overview
tags: [tag1, tag2]
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: [[Page Title]], [[Other Page]]
---
```

### Cross-References
Use Obsidian wiki-link syntax: `[[Page Title]]`. Always link to related pages — this powers the graph view.

### ADR Format (wiki/decisions/)
```
## Context
Why this decision was needed.

## Decision
What was decided.

## Rationale
Why this option over alternatives.

## Consequences
Trade-offs and implications.

## Status
Accepted | Superseded by [[ADR Name]]
```

### Source Summary Format (wiki/sources/)
```
## Summary
2-3 sentence synthesis.

## Key Takeaways
- Bullet points of what matters for Vaultly.

## Relevance
How this connects to the current project.

## Links To
[[Concept Page]], [[Decision Page]]
```

---

## Workflows

### Ingest
User says: `"ingest raw/filename.md"`
1. Read the source file
2. Discuss key takeaways with the user
3. Write a summary page in `wiki/sources/`
4. Update all relevant concept/decision pages
5. Update `index.md`
6. Append an entry to `log.md`

### Query
User asks a question against the wiki.
1. Read `index.md` to find relevant pages
2. Read those pages
3. Synthesize an answer with `[[citations]]`
4. If the answer is worth keeping, offer to file it as a new wiki page

### Lint
User says: `"lint the wiki"`
1. Scan for contradictions between pages
2. Flag stale claims superseded by newer decisions
3. Find orphan pages (no inbound links)
4. Find concepts mentioned but lacking their own page
5. Suggest new sources to find or questions to investigate

### Code Changes → Wiki Update
After any significant architectural change to Vaultly:
1. Check if an existing ADR or concept page needs updating
2. If a new architectural decision was made, create a new ADR in `wiki/decisions/`
3. Update `index.md` and append to `log.md`

---

## Index File Format (`index.md`)

Sections: Overview | Concepts | Decisions | Sources

Each entry: `- [[Page Title]] — one-line description`

---

## Log File Format (`log.md`)

Each entry starts with: `## [YYYY-MM-DD] type | title`

Types: `ingest` | `query` | `decision` | `lint` | `update`

Entries are append-only — never edit past entries.
