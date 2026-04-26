---
title: ADR — Tiptap Rich Text Editor
type: decision
tags: [editor, tiptap, ux]
created: 2026-04-20
updated: 2026-04-20
related: [[overview]]
---

# ADR — Tiptap Rich Text Editor

## Context

Vaultly needed a rich text editor that works well on mobile (iPhone browser), supports voice dictation integration, and produces clean serializable output compatible with encryption.

## Decision

Use Tiptap 3.x as the journal entry editor.

## Rationale

- Tiptap is headless — no opinionated styles, full control via Tailwind
- Built on ProseMirror, which is battle-tested and extensible
- Strong React integration with a clean hook-based API (`useEditor`)
- JSON output format is straightforward to encrypt as a string (`JSON.stringify(editor.getJSON())`)
- Active maintenance and good documentation
- Voice dictation via browser Speech API inserts text at cursor position naturally with Tiptap's `insertContent` command

## Alternatives Considered

- **Quill:** Older, less actively maintained, weaker TypeScript support
- **Slate:** More flexible but requires much more custom implementation for basic features; steeper learning curve
- **Plain `<textarea>`:** Simpler but no formatting, no voice dictation cursor integration, poor mobile UX for a journaling app

## Consequences

- Editor output is stored as JSON string before encryption — must `JSON.parse` on decrypt before rendering
- Tiptap extensions (Bold, Italic, Heading, etc.) must be explicitly imported — bundle size grows with each extension
- Mobile keyboard handling requires testing on actual iPhone Safari — desktop browser testing is insufficient

## Status

Accepted
