"use client"

import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import CoachPanel, { type CoachContext } from "@/components/CoachPanel"
import HabitsPanel from "@/components/HabitsPanel"
import { encryptWithMek, decryptWithMek } from "@/lib/crypto"
import { track } from "@/lib/analytics"

// ── Dictation mime-type helper ────────────────────────────────────────────
function getDictationMimeType(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(window as any).MediaRecorder) return ""
  const types = ["audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"]
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ""
}

// ── Grammar-fix position mapper ───────────────────────────────────────────
// Converts a plain-text offset produced by editor.getText({ blockSeparator: "\n\n" })
// into the corresponding ProseMirror document position so fixes can be applied
// directly in the document (preserving all paragraph / formatting structure).
//
// Algorithm: walk the ProseMirror node tree depth-first, mirroring exactly
// what getText does — advance textOffset by character count for text nodes,
// and by 2 (the length of "\n\n") when crossing into a non-first block sibling.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildGrammarPosMap(doc: any): (offset: number) => number {
  const map: number[] = []
  let textOffset = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any, docPos: number, isRoot: boolean) {
    if (node.isText) {
      const str: string = node.text
      for (let i = 0; i < str.length; i++) map[textOffset++] = docPos + i
      return
    }
    let firstBlock = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node.forEach((child: any, childFragOffset: number) => {
      // In ProseMirror, a child's absolute doc position = parent's docPos + 1 (open token) + fragOffset.
      // For the doc root there is no open token, so childDocPos = fragOffset directly.
      const childDocPos = isRoot ? childFragOffset : docPos + 1 + childFragOffset
      if (child.isBlock && !firstBlock) {
        // blockSeparator "\n\n" (2 chars) between adjacent block siblings
        map[textOffset++] = childDocPos
        map[textOffset++] = childDocPos
      }
      if (child.isBlock) firstBlock = false
      walk(child, childDocPos, false)
    })
  }

  walk(doc, 0, true)
  map[textOffset] = doc.content.size   // sentinel for end-of-document
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (offset: number) => map[Math.min(Math.max(0, offset), map.length - 1)] ?? (doc as any).content.size
}

// ── Inline SVG icons (Heroicons 2 solid / outline) ───────────────────────

function IconBold() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M5.5 4a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5H11a4 4 0 0 0 2.58-7.055A3.5 3.5 0 0 0 9.5 4H5.5Zm4 6.5H7V6h2.5a1.5 1.5 0 0 1 0 3H9.5v1.5Zm0 1.5H7v3h4a2 2 0 0 0 0-4H9.5Z" clipRule="evenodd" />
    </svg>
  )
}
function IconItalic() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M8.187 16h2.686L12.813 4h-2.686L8.187 16ZM5 15.25c0-.414.336-.75.75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM10.75 4.25c0-.414.336-.75.75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  )
}
function IconH1() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M4.75 3.5a.75.75 0 0 1 .75.75V9.5h5V4.25a.75.75 0 0 1 1.5 0v11.5a.75.75 0 0 1-1.5 0V11H5.5v4.75a.75.75 0 0 1-1.5 0V4.25a.75.75 0 0 1 .75-.75ZM16 7.5l-2 1V7l2-1v9.5h-1.5V7.5H16Z" />
    </svg>
  )
}
function IconH2() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M4.75 3.5a.75.75 0 0 1 .75.75V9.5h5V4.25a.75.75 0 0 1 1.5 0v11.5a.75.75 0 0 1-1.5 0V11H5.5v4.75a.75.75 0 0 1-1.5 0V4.25a.75.75 0 0 1 .75-.75ZM13.5 9c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 1.1-.67 1.9-1.5 2.74L15.5 13.5H18V15h-4v-1.5l2-2c.74-.74 1-1.18 1-1.5 0-.55-.45-1-1-1s-1 .45-1 1h-1.5Z" />
    </svg>
  )
}
function IconBulletList() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M4 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm2.75-1.5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5ZM5 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  )
}
function IconOrderedList() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M4.75 3h.5a.75.75 0 0 1 0 1.5h-.25V6a.75.75 0 0 1-1.5 0V3.75A.75.75 0 0 1 4.75 3Zm2 1a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5ZM4 9.5h1V11H3.5a.75.75 0 0 1 0-1.5H4v-.25a.75.75 0 0 1 1.5 0V10c0 .414-.336.75-.75.75H4V9.5Zm-1 5.5c0-.414.336-.75.75-.75h1.5a.75.75 0 0 1 .53 1.28l-.72.72H6a.75.75 0 0 1 0 1.5H3.5a.75.75 0 0 1-.53-1.28l.72-.72H3a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
  )
}
function IconMic({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
      style={{ color: active ? "var(--color-accent)" : "currentColor" }}>
      <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
      <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
    </svg>
  )
}
function IconSparkles() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.239a1 1 0 0 0 0 1.962l1.192.24a1 1 0 0 1 .785.783l.239 1.192a1 1 0 0 0 1.962 0l.24-1.192a1 1 0 0 1 .783-.784l1.192-.24a1 1 0 0 0 0-1.962l-1.192-.239a1 1 0 0 1-.784-.785l-.24-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
    </svg>
  )
}
function IconCheckCircle() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  )
}
function IconTrash() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
  )
}
function IconArrowLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
    </svg>
  )
}
function IconXMark() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}
function IconHome() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
    </svg>
  )
}
function IconPhoto() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clipRule="evenodd" />
    </svg>
  )
}
function IconVideoCamera() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 0 0 1.28-.53V4.75Z" />
    </svg>
  )
}
function IconChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}
function IconExpand() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.69l-3.22 3.22a.75.75 0 0 0 1.06 1.06ZM2 13.25a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 0-1.5H4.56l3.22-3.22a.75.75 0 0 0-1.06-1.06L3.5 11.44V8.75a.75.75 0 0 0-1.5 0v4.5Z" />
    </svg>
  )
}

// ── Mood config ──────────────────────────────────────────────────────────
const MOODS = [
  { value: "GREAT", label: "Great", color: "#22c55e" },
  { value: "GOOD",  label: "Good",  color: "#3b82f6" },
  { value: "OKAY",  label: "Okay",  color: "#eab308" },
  { value: "LOW",   label: "Low",   color: "#f97316" },
  { value: "AWFUL", label: "Awful", color: "#ef4444" },
]

// ── Types ────────────────────────────────────────────────────────────────
interface LTMatch {
  message:      string
  shortMessage: string
  replacements: { value: string }[]
  offset:       number
  length:       number
  context:      { text: string; offset: number; length: number }
  rule:         { id: string; description: string; category: { id: string; name: string } }
}
interface GrammarResult {
  matches:      LTMatch[]
  originalText: string
}

// Map LanguageTool category IDs to display labels + colours
function ltCategoryStyle(catId: string): { label: string; bg: string; color: string } {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    TYPOS:          { label: "spelling",     bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
    CONFUSED_WORDS: { label: "word choice",  bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
    GRAMMAR:        { label: "grammar",      bg: "rgba(234,179,8,0.12)",   color: "#ca8a04" },
    SUBJECT_VERB:   { label: "grammar",      bg: "rgba(234,179,8,0.12)",   color: "#ca8a04" },
    PUNCTUATION:    { label: "punctuation",  bg: "rgba(99,102,241,0.12)",  color: "#6366f1" },
    CASING:         { label: "casing",       bg: "rgba(99,102,241,0.12)",  color: "#6366f1" },
    STYLE:          { label: "style",        bg: "rgba(168,85,247,0.12)",  color: "#a855f7" },
    REDUNDANCY:     { label: "redundancy",   bg: "rgba(245,158,11,0.12)",  color: "#d97706" },
    SEMANTICS:      { label: "semantics",    bg: "rgba(20,184,166,0.12)",  color: "#0d9488" },
  }
  return map[catId] ?? { label: catId.toLowerCase(), bg: "rgba(99,102,241,0.12)", color: "#6366f1" }
}
export type SaveData = { title: string; content: string; mood: string | null }

export interface MediaMeta {
  id:         string
  fileName:   string
  mimeType:   string
  fileSize:   number
  caption:    string | null
  createdAt:  string
  /** Supabase Storage CDN URL — persisted in DB, loaded from API on subsequent visits. */
  storageUrl?: string | null
  /** In-memory only — blob URL from the upload for instant display. Never persisted. */
  blobUrl?:   string
}

export interface JournalEditorProps {
  initialTitle?:   string
  initialContent?: string
  initialMood?:    string | null
  initialMedia?:   MediaMeta[]
  entryId?:        string | null  // null on brand-new entries until first auto-save
  mek?:            CryptoKey | null  // MEK for encrypting media captions client-side
  onSave:       (data: SaveData) => Promise<void>
  onAutoSave?:  (data: SaveData) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
  draftKey?: string
  // ── AI Coach ──────────────────────────────────────────────────────────
  coachContext?:   CoachContext | null
  recentEntries?:  string[]         // decrypted entries (when privacy toggle ON)
  showCoach?:      boolean
  onToggleCoach?:  () => void
  // ── Daily prompt carry-over ───────────────────────────────────────────
  activePrompt?:   string | null    // shown as a banner above the editor
}

// ── Toolbar button ───────────────────────────────────────────────────────
function TBtn({
  onClick, active = false, disabled = false, title: tip, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={tip}
      aria-label={tip}
      className="w-8 h-8 flex items-center justify-center rounded-md transition-colors focus:outline-none disabled:opacity-30 flex-shrink-0"
      style={{
        backgroundColor: active ? "var(--color-accent)" : "transparent",
        color: active ? "#ffffff" : "var(--color-ink-muted)",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent" }}
    >
      {children}
    </button>
  )
}

// ── Component ────────────────────────────────────────────────────────────
export default function JournalEditor({
  initialTitle   = "",
  initialContent = "",
  initialMood    = null,
  initialMedia   = [],
  entryId        = null,
  mek            = null,
  onSave,
  onAutoSave,
  onCancel,
  onDelete,
  draftKey = "journal-draft-new",
  coachContext  = null,
  recentEntries,
  showCoach     = false,
  onToggleCoach,
  activePrompt  = null,
}: JournalEditorProps) {
  const [title,  setTitle]  = useState(initialTitle)
  const [mood,   setMood]   = useState<string | null>(initialMood)
  const [saving, setSaving] = useState(false)

  // Word / char count
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const wordCountRef = useRef(0)   // mirror for use inside async callbacks

  // Media attachments
  type UploadingItem = { tempId: string; fileName: string; mimeType: string; preview: string }
  const [savedMedia,     setSavedMedia]     = useState<MediaMeta[]>(initialMedia)
  const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([])
  const [mediaErrors,    setMediaErrors]    = useState<string[]>([])
  const [lightboxIndex,  setLightboxIndex]  = useState<number | null>(null)
  const [mediaDeleteConfirm, setMediaDeleteConfirm] = useState<{ mediaId: string; mimeType: string } | null>(null)
  const [mediaDeletingId,    setMediaDeletingId]    = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Caption editing (inside lightbox)
  const [captionText,   setCaptionText]   = useState("")        // current draft (always plaintext)
  const [captionStatus, setCaptionStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const captionTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const captionSaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const captionSavingRef   = useRef(false)  // prevent concurrent saves
  const captionTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Voice dictation — MediaRecorder → Whisper API
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const editorRef         = useRef<Editor | null>(null)  // stable ref so closures always see latest editor
  const [isRecording,       setIsRecording]       = useState(false)
  const [isTranscribing,    setIsTranscribing]    = useState(false)
  const [dictationAvailable, setDictationAvailable] = useState(false)
  const [dictationError,    setDictationError]    = useState<string | null>(null)
  const [recordingSeconds,  setRecordingSeconds]  = useState(0)

  // Grammar check
  const [grammarLoading, setGrammarLoading] = useState(false)
  const [grammarResult,  setGrammarResult]  = useState<GrammarResult | null>(null)

  // DB auto-save status
  const [dbStatus,      setDbStatus]      = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [lastSavedTime, setLastSavedTime] = useState<string>("")
  // Draft recovery (new entries only)
  const [draftBanner, setDraftBanner] = useState<{ title: string; content: string; savedAt: number } | null>(null)

  // Live plain-text fed to the coach panel
  const [liveEditorText, setLiveEditorText] = useState("")
  const liveTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mobile tab state ("write" | "habits" | "coach")
  const [mobileTab, setMobileTab] = useState<"write" | "habits" | "coach">("write")

  // Desktop right panel — habits panel is hidden until explicitly opened
  const [showHabits, setShowHabits] = useState(false)

  // Stable refs for use inside onUpdate closure
  const titleRef      = useRef(initialTitle)
  const moodRef       = useRef<string | null>(initialMood)
  const onAutoSaveRef = useRef(onAutoSave)
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dbTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSavingRef = useRef(false)   // prevents concurrent in-flight saves
  const didMountRef   = useRef(false)   // skips initial render in title/mood effects

  useEffect(() => { titleRef.current      = title      }, [title])
  useEffect(() => { moodRef.current       = mood       }, [mood])
  useEffect(() => { onAutoSaveRef.current = onAutoSave }, [onAutoSave])
  // Mark mounted after all initial effects have run
  useEffect(() => { didMountRef.current = true }, [])

  // Stop dictation on unmount
  useEffect(() => {
    return () => {
      try { mediaRecorderRef.current?.stop() } catch { /* */ }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Revoke in-memory blob URLs on unmount to free browser memory
  const savedMediaRef = useRef(savedMedia)
  useEffect(() => { savedMediaRef.current = savedMedia }, [savedMedia])
  useEffect(() => {
    return () => {
      savedMediaRef.current.forEach((m) => { if (m.blobUrl) URL.revokeObjectURL(m.blobUrl) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    function onKey(e: KeyboardEvent) {
      // Don't hijack arrow keys while the caption textarea is focused
      if (document.activeElement?.tagName === "TEXTAREA") return
      if (e.key === "Escape") {
        setLightboxIndex(null)
      }
      if (e.key === "ArrowRight" && lightboxIndex !== null && lightboxIndex < savedMedia.length - 1) {
        navigateLightbox(lightboxIndex + 1)
      }
      if (e.key === "ArrowLeft" && lightboxIndex !== null && lightboxIndex > 0) {
        navigateLightbox(lightboxIndex - 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, savedMedia.length, captionText])

  // Decrypt captions in saved media when MEK becomes available.
  // Captions are stored as "iv:ciphertext" (base64). On first load the
  // savedMedia state contains the encrypted strings from the server — we
  // decrypt them into plaintext here so the UI always shows human-readable text.
  useEffect(() => {
    if (!mek) return
    let cancelled = false
    Promise.all(
      savedMedia.map(async (item) => {
        if (!item.caption || !item.caption.includes(":")) return item
        try {
          const colonIdx = item.caption.indexOf(":")
          const iv         = item.caption.slice(0, colonIdx)
          const ciphertext = item.caption.slice(colonIdx + 1)
          const plaintext  = await decryptWithMek(ciphertext, iv, mek)
          return { ...item, caption: plaintext }
        } catch {
          return { ...item, caption: null }  // decryption failed — clear gracefully
        }
      }),
    ).then((decrypted) => {
      if (!cancelled) setSavedMedia(decrypted)
    }).catch(() => {})
    return () => { cancelled = true }
  // We only want this to run when mek first becomes available, not on every
  // savedMedia mutation — the stale savedMedia at mek-unlock time is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mek])

  // Auto-resize caption textarea whenever captionText changes (user typing OR
  // programmatic value changes when navigating between images).
  useEffect(() => {
    const el = captionTextareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [captionText])

  // Feature-detect MediaRecorder + getUserMedia after mount
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!!(window as any).MediaRecorder && !!navigator.mediaDevices) {
        setDictationAvailable(true)
      }
    } catch { /* SSR */ }
  }, [])

  // Check for a recoverable local draft (new entries only — initialContent is empty)
  useEffect(() => {
    if (initialContent) return   // editing an existing entry — skip
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const draft = JSON.parse(raw) as { title?: string; content?: string; savedAt?: number }
      const ageMs = Date.now() - (draft.savedAt ?? 0)
      if (ageMs < 86_400_000 && draft.content && draft.content !== "<p></p>") {
        setDraftBanner({ title: draft.title ?? "", content: draft.content, savedAt: draft.savedAt ?? 0 })
      }
    } catch { /* */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // mount-only — intentional

  // ── Shared DB auto-save helper ───────────────────────────────────────
  // Reads the latest values from refs so it's safe to call from any
  // closure (onUpdate, title effect, mood effect) without stale captures.
  function scheduleDbSave(delayMs: number) {
    if (dbTimerRef.current) clearTimeout(dbTimerRef.current)
    dbTimerRef.current = setTimeout(async () => {
      if (autoSavingRef.current) return
      const fn = onAutoSaveRef.current
      if (!fn) return
      const content = editorRef.current?.getHTML() ?? ""
      autoSavingRef.current = true
      setDbStatus("saving")
      try {
        await fn({ title: titleRef.current || "Untitled", content, mood: moodRef.current })
        setDbStatus("saved")
        setLastSavedTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))
        track("entry_saved", {
          type:       entryId ? "existing" : "new",
          word_count: wordCountRef.current,
        })
      } catch {
        setDbStatus("error")
      } finally {
        autoSavingRef.current = false
      }
    }, delayMs)
  }

  // ── Tiptap editor ────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const text = editor.getText()
      const wc = text.trim() ? text.trim().split(/\s+/).length : 0
      setWordCount(wc)
      wordCountRef.current = wc
      setCharCount(text.length)

      // ── Debounced live text for coach panel (500 ms) ──
      if (liveTextTimerRef.current) clearTimeout(liveTextTimerRef.current)
      liveTextTimerRef.current = setTimeout(() => setLiveEditorText(text), 500)

      const html = editor.getHTML()

      // ── Fast local draft save (3 s) ──
      if (localTimerRef.current) clearTimeout(localTimerRef.current)
      localTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify({ title: titleRef.current, content: html, savedAt: Date.now() }))
        } catch { /* */ }
      }, 3_000)

      // ── DB auto-save (2 s after last keystroke) ──
      scheduleDbSave(2_000)
    },
    editorProps: {
      attributes: {
        class:            "journal-prose min-h-[52vh] focus:outline-none px-6 py-5",
        role:             "textbox",
        "aria-label":     "Journal entry body",
        "aria-multiline": "true",
      },
    },
  })

  // Keep editorRef current (must live after useEditor declaration)
  useEffect(() => { editorRef.current = editor }, [editor])

  // ── When Coach opens, close the habits panel so they don't fight ─────
  useEffect(() => {
    if (showCoach) setShowHabits(false)
  }, [showCoach])

  // ── Auto-save on title change (2 s debounce) ─────────────────────────
  // onUpdate only fires on editor content changes, so title-only edits
  // would never reach the DB without this effect.
  useEffect(() => {
    if (!didMountRef.current) return
    scheduleDbSave(2_000)
    // scheduleDbSave reads from refs — no dep on it needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title])

  // ── Auto-save on mood change (immediate-ish: 800 ms) ─────────────────
  // Mood clicks are intentional and discrete; save quickly.
  useEffect(() => {
    if (!didMountRef.current) return
    scheduleDbSave(800)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood])

  // ── Voice dictation — MediaRecorder → Whisper API ───────────────────────

  async function startDictation() {
    setDictationError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const mimeType = getDictationMimeType()
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      mr.onstop = async () => {
        // Stop all tracks so browser mic indicator clears
        stream.getTracks().forEach((t) => t.stop())
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        setIsRecording(false)
        setIsTranscribing(true)

        try {
          const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" })
          const ext  = mr.mimeType?.includes("mp4") ? "mp4"
                     : mr.mimeType?.includes("ogg")  ? "ogg"
                     : "webm"
          const fd = new FormData()
          fd.append("audio", blob, `dictation.${ext}`)

          const res = await fetch("/api/transcribe", { method: "POST", body: fd })
          if (!res.ok) throw new Error(await res.text())
          const { text } = await res.json() as { text: string }

          if (text?.trim()) {
            const ed = editorRef.current
            if (ed) {
              ed.commands.focus()
              ed.commands.insertContent(text.trim() + " ")
            }
          }
        } catch {
          setDictationError("Transcription failed. Please try again.")
        } finally {
          setIsTranscribing(false)
          setRecordingSeconds(0)
        }
      }

      // Collect data in 250 ms slices so we have chunks even if onstop fires late
      mr.start(250)
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1)
      }, 1000)

    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ""
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setDictationError("Microphone access denied. Allow microphone access in your browser settings.")
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setDictationError("No microphone found on this device.")
      } else {
        const msg = err instanceof Error ? err.message : "unknown error"
        setDictationError(`Could not access microphone: ${msg}`)
      }
    }
  }

  function stopDictation() {
    try { mediaRecorderRef.current?.stop() } catch { /* */ }
  }

  function handleDictateClick() {
    if (isRecording) stopDictation()
    else if (!isTranscribing) void startDictation()
  }

  // ── Grammar check (LanguageTool) ─────────────────────────────────────
  async function runGrammarCheck() {
    if (!editor || grammarLoading) return
    // Use "\n\n" explicitly — this is Tiptap v3's default block separator,
    // and reconstruction must split on the same string.
    const text = editor.getText({ blockSeparator: "\n\n" })
    if (text.trim().length < 10) return

    setGrammarLoading(true)
    setGrammarResult(null)
    try {
      const res = await fetch("/api/grammar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      })
      if (res.ok) {
        const data: GrammarResult = await res.json()
        setGrammarResult(data)
      }
    } catch { /* silently ignore */ }
    setGrammarLoading(false)
  }

  // Apply ALL remaining fixable matches at once.
  // Fixes are applied back-to-front in a single ProseMirror transaction so each
  // higher-offset replacement doesn't shift the positions of lower-offset ones.
  // Using direct doc-position replacement preserves ALL paragraph / formatting structure.
  function applyGrammarFix() {
    if (!grammarResult || !editor) return
    const toApply = [...grammarResult.matches]
      .filter((m) => m.replacements.length > 0)
      .sort((a, b) => b.offset - a.offset)   // back-to-front

    // Build position map once from the current document
    const docPos = buildGrammarPosMap(editor.state.doc)

    editor.chain().focus().command(({ tr, state }) => {
      for (const m of toApply) {
        const from = docPos(m.offset)
        const to   = docPos(m.offset + m.length)
        if (from >= to) continue
        tr.replaceWith(from, to, state.schema.text(m.replacements[0].value))
      }
      return true
    }).run()

    setGrammarResult(null)
  }

  // Apply a single match's top suggestion, then recalculate remaining offsets.
  // Uses direct ProseMirror insertion to preserve paragraphs and formatting.
  function applyOneFix(idx: number) {
    if (!grammarResult || !editor) return
    const m = grammarResult.matches[idx]
    if (!m.replacements.length) return

    const replacement = m.replacements[0].value
    const delta = replacement.length - m.length

    const docPos = buildGrammarPosMap(editor.state.doc)
    const from = docPos(m.offset)
    const to   = docPos(m.offset + m.length)

    if (from < to) {
      editor.chain().focus().insertContentAt({ from, to }, replacement).run()
    }

    // Update remaining match offsets
    const newText =
      grammarResult.originalText.slice(0, m.offset) +
      replacement +
      grammarResult.originalText.slice(m.offset + m.length)

    const newMatches = grammarResult.matches
      .filter((_, i) => i !== idx)
      .map((rem) => ({
        ...rem,
        offset: rem.offset > m.offset ? rem.offset + delta : rem.offset,
      }))

    setGrammarResult(
      newMatches.length > 0
        ? { matches: newMatches, originalText: newText }
        : null
    )
  }

  // Dismiss one match without changing the text
  function dismissOne(idx: number) {
    if (!grammarResult) return
    const newMatches = grammarResult.matches.filter((_, i) => i !== idx)
    setGrammarResult(newMatches.length > 0
      ? { ...grammarResult, matches: newMatches }
      : null
    )
  }

  // ── Media upload ─────────────────────────────────────────────────────

  // Compress an image to max 1920 px wide/tall.
  // Uses 85% quality on first pass; if the result is still > 3 MB, re-encodes
  // at 65% quality to stay well within Vercel's 4.5 MB request-body limit.
  // Non-image files (videos) are passed through unchanged.
  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) return file

    const toBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
      new Promise((res) => canvas.toBlob(res, "image/jpeg", quality))

    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = async () => {
        URL.revokeObjectURL(url)
        const MAX = 1920
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const w = Math.round(img.width  * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement("canvas")
        canvas.width  = w
        canvas.height = h
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)

        const outName = file.name.replace(/\.[^.]+$/, ".jpg")

        // First pass at 85% quality
        let blob = await toBlob(canvas, 0.85)

        // Second pass at 65% if still > 3 MB (well under Vercel's 4.5 MB limit)
        if (blob && blob.size > 3 * 1024 * 1024) {
          blob = await toBlob(canvas, 0.65)
        }

        resolve(
          blob
            ? new File([blob], outName, { type: "image/jpeg" })
            : file  // fallback: original file unchanged
        )
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""   // reset so same file can be re-selected

    if (!entryId) return  // button is disabled, shouldn't reach here

    for (const file of files) {
      // Size limits
      const isImage = file.type.startsWith("image/")
      const isVideo = file.type.startsWith("video/")
      if (!isImage && !isVideo) {
        setMediaErrors((p) => [...p, `${file.name}: only images and videos are supported`])
        continue
      }
      if (isImage && file.size > 15 * 1024 * 1024) {
        setMediaErrors((p) => [...p, `${file.name}: image is too large (max 15 MB)`])
        continue
      }
      if (isVideo && file.size > 100 * 1024 * 1024) {
        setMediaErrors((p) => [...p, `${file.name}: video is too large (max 100 MB)`])
        continue
      }

      const tempId  = Math.random().toString(36).slice(2)
      const preview = URL.createObjectURL(file)

      setUploadingItems((p) => [...p, { tempId, fileName: file.name, mimeType: file.type, preview }])

      try {
        const compressed = await compressImage(file)
        const form = new FormData()
        form.append("file", compressed)

        const uploadUrl = `/api/entries/${entryId}/media`
        let res = await fetch(uploadUrl, { method: "POST", body: form })

        // 404 can happen briefly on brand-new entries due to DB read-after-write
        // lag (PgBouncer connection-pool routing). Retry once after a short pause.
        if (res.status === 404) {
          await new Promise<void>((resolve) => setTimeout(resolve, 1_500))
          res = await fetch(uploadUrl, { method: "POST", body: form })
        }

        setUploadingItems((p) => p.filter((u) => u.tempId !== tempId))

        if (res.ok) {
          const data: MediaMeta = await res.json()
          // Carry the blob URL from the upload into savedMedia so the thumbnail
          // displays instantly without a round-trip back to the server.
          // The blob URL is revoked when the item is deleted or the component unmounts.
          setSavedMedia((p) => [...p, { ...data, blobUrl: preview }])
          track("media_uploaded", {
            media_type: compressed.type.startsWith("video/") ? "video" : "image",
          })
        } else {
          // Read the actual error reason — only parse as JSON when Content-Type says so.
          // If the 404 came from Next.js routing (HTML body) this avoids a parse error
          // and falls back to a clear status-based message instead.
          let reason: string
          if (res.status === 404) {
            reason = "entry not found — please try saving your entry first, then retry"
          } else {
            reason = `server error ${res.status}`
            try {
              const ct = res.headers.get("content-type") ?? ""
              if (ct.includes("application/json")) {
                const errBody = await res.json()
                if (typeof errBody?.error === "string" && errBody.error) {
                  reason = errBody.error
                }
              }
            } catch { /* ignore parse errors */ }
          }
          URL.revokeObjectURL(preview)
          setMediaErrors((p) => [...p, `Failed to upload ${file.name}: ${reason}`])
        }
      } catch (err) {
        URL.revokeObjectURL(preview)
        setUploadingItems((p) => p.filter((u) => u.tempId !== tempId))
        const reason = err instanceof Error ? err.message : "network error"
        setMediaErrors((p) => [...p, `Failed to upload ${file.name}: ${reason}`])
      }
    }
  }

  function handleDeleteMedia(mediaId: string) {
    if (!entryId) return
    const item = savedMedia.find((m) => m.id === mediaId)
    setMediaDeleteConfirm({ mediaId, mimeType: item?.mimeType ?? "" })
  }

  async function confirmDeleteMedia() {
    if (!mediaDeleteConfirm || !entryId) return
    const { mediaId } = mediaDeleteConfirm
    setMediaDeletingId(mediaId)
    try {
      const res = await fetch(`/api/entries/${entryId}/media/${mediaId}`, { method: "DELETE" })
      if (res.ok) {
        setSavedMedia((p) => {
          const removed = p.find((m) => m.id === mediaId)
          if (removed?.blobUrl) URL.revokeObjectURL(removed.blobUrl)
          return p.filter((m) => m.id !== mediaId)
        })
        // Close lightbox if it was showing the deleted item
        if (lightboxIndex !== null && savedMedia[lightboxIndex]?.id === mediaId) {
          setLightboxIndex(null)
        }
      }
    } finally {
      setMediaDeletingId(null)
      setMediaDeleteConfirm(null)
    }
  }

  // ── Caption save ──────────────────────────────────────────────────────
  // Saves the caption for a media item.
  // Called on blur (immediate) and after an 800ms debounce while typing.
  // Captions are AES-256 encrypted client-side with the MEK before sending
  // to the server — stored as "base64(iv):base64(ciphertext)".
  async function saveCaption(mediaId: string, text: string) {
    if (!entryId || captionSavingRef.current) return
    captionSavingRef.current = true
    setCaptionStatus("saving")
    try {
      // Encrypt with MEK if available; plaintext fallback should never occur
      // in normal usage (MEK is always set after password unlock).
      let captionPayload: string | null = null
      if (text.trim()) {
        if (mek) {
          const { ciphertext, iv } = await encryptWithMek(text.trim(), mek)
          captionPayload = `${iv}:${ciphertext}`
        } else {
          captionPayload = text.trim()  // fallback (no MEK)
        }
      }

      const res = await fetch(`/api/entries/${entryId}/media/${mediaId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ caption: captionPayload }),
      })

      if (res.ok) {
        // Update local state with the PLAINTEXT version (not the encrypted payload)
        setSavedMedia((prev) => prev.map((m) =>
          m.id === mediaId ? { ...m, caption: text.trim() || null } : m,
        ))
        setCaptionStatus("saved")
        if (captionSaveTimer.current) clearTimeout(captionSaveTimer.current)
        captionSaveTimer.current = setTimeout(() => setCaptionStatus("idle"), 2_000)
      } else {
        const status = res.status
        const body   = await res.text().catch(() => "")
        console.error(`[caption] PATCH failed ${status}:`, body)
        setCaptionStatus("error")
      }
    } catch (err) {
      console.error("[caption] save error:", err)
      setCaptionStatus("error")
    } finally {
      captionSavingRef.current = false
    }
  }

  function handleCaptionChange(mediaId: string, value: string) {
    setCaptionText(value)
    setCaptionStatus("idle")
    // Debounce: save 800ms after last keystroke
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current)
    captionTimerRef.current = setTimeout(() => saveCaption(mediaId, value), 800)
  }

  // When the lightbox navigates to a different item, flush any pending caption save
  // for the current item, then load the new item's caption.
  function navigateLightbox(newIndex: number) {
    // Flush debounce for current item if there's a pending save
    if (captionTimerRef.current && lightboxIndex !== null) {
      clearTimeout(captionTimerRef.current)
      captionTimerRef.current = null
      const currentItem = savedMedia[lightboxIndex]
      if (currentItem) saveCaption(currentItem.id, captionText)
    }
    setLightboxIndex(newIndex)
    setCaptionText(savedMedia[newIndex]?.caption ?? "")
    setCaptionStatus("idle")
  }

  // ── Coach: insert text at end of entry ──────────────────────────────
  function handleInsertToEntry(text: string) {
    if (!editor) return
    editor.chain()
      .focus()
      .setTextSelection(editor.state.doc.content.size)
      .insertContent(`<p>${text}</p>`)
      .run()
  }

  // ── Save ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!editor) return
    // Cancel any pending auto-save timers so we don't double-write
    if (localTimerRef.current) clearTimeout(localTimerRef.current)
    if (dbTimerRef.current)    clearTimeout(dbTimerRef.current)
    setSaving(true)
    setDbStatus("saving")
    try {
      await onSave({ title: title.trim() || "Untitled", content: editor.getHTML(), mood })
      try { localStorage.removeItem(draftKey) } catch { /* */ }
      setDbStatus("saved")
      setLastSavedTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))
    } catch {
      setDbStatus("error")
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  return (
    <div
      className="flex min-h-screen md:flex-row flex-col"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
    {/* ── Mobile tab switcher ─────────────────────────────────────────── */}
    <div
      role="tablist"
      aria-label="Editor sections"
      className="md:hidden flex items-center border-b flex-shrink-0"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <button
        role="tab"
        aria-selected={mobileTab === "write"}
        aria-controls="mobile-panel-write"
        id="mobile-tab-write"
        onClick={() => setMobileTab("write")}
        className="flex-1 py-2.5 text-sm font-inter font-medium transition-colors"
        style={{
          color: mobileTab === "write" ? "var(--color-accent)" : "var(--color-ink-muted)",
          borderBottom: mobileTab === "write" ? "2px solid var(--color-accent)" : "2px solid transparent",
        }}
      >
        Write
      </button>
      <button
        role="tab"
        aria-selected={mobileTab === "habits"}
        aria-controls="mobile-panel-habits"
        id="mobile-tab-habits"
        onClick={() => setMobileTab("habits")}
        className="flex-1 py-2.5 text-sm font-inter font-medium transition-colors flex items-center justify-center gap-1.5"
        style={{
          color: mobileTab === "habits" ? "var(--color-accent)" : "var(--color-ink-muted)",
          borderBottom: mobileTab === "habits" ? "2px solid var(--color-accent)" : "2px solid transparent",
        }}
      >
        <IconCheckCircle />
        Habits
      </button>
      {onToggleCoach && (
        <button
          role="tab"
          aria-selected={mobileTab === "coach"}
          aria-controls="mobile-panel-coach"
          id="mobile-tab-coach"
          onClick={() => { setMobileTab("coach"); if (mobileTab !== "coach") track("coach_panel_opened", { device: "mobile" }) }}
          className="flex-1 py-2.5 text-sm font-inter font-medium transition-colors flex items-center justify-center gap-1.5"
          style={{
            color: mobileTab === "coach" ? "var(--color-accent)" : "var(--color-ink-muted)",
            borderBottom: mobileTab === "coach" ? "2px solid var(--color-accent)" : "2px solid transparent",
          }}
        >
          <IconSparkles />
          Coach
        </button>
      )}
    </div>

    {/* ── Mobile habits panel (full-screen, hides editor) ─────────────── */}
    {mobileTab === "habits" && (
      <div role="tabpanel" id="mobile-panel-habits" aria-labelledby="mobile-tab-habits" className="md:hidden flex-1 flex flex-col overflow-y-auto" style={{ minHeight: 0 }}>
        <HabitsPanel />
      </div>
    )}

    {/* ── Mobile coach panel (full-screen, hides editor) ──────────────── */}
    {mobileTab === "coach" && onToggleCoach && (
      <div role="tabpanel" id="mobile-panel-coach" aria-labelledby="mobile-tab-coach" className="md:hidden flex-1 flex flex-col" style={{ minHeight: 0 }}>
        <CoachPanel
          entryContent={liveEditorText}
          recentEntries={recentEntries}
          coachContext={coachContext}
          entryId={entryId}
          onClose={() => setMobileTab("write")}
          onInsertToEntry={handleInsertToEntry}
        />
      </div>
    )}

    {/* ── Editor column (hidden on mobile when habits or coach tab active) */}
    <div
      className={`flex flex-col md:flex-1 md:min-w-0 ${mobileTab !== "write" ? "hidden md:flex" : "flex"}`}
      style={{ backgroundColor: "var(--color-surface)" }}
    >

      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 grid items-center px-4 h-14 border-b"
        style={{
          gridTemplateColumns: "1fr auto 1fr",
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Left: nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 h-9 px-2 text-sm font-inter transition-colors rounded-lg"
            style={{ color: "var(--color-ink-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-ink)"; e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-muted)"; e.currentTarget.style.backgroundColor = "transparent" }}
          >
            <IconArrowLeft />
            <span>Back</span>
          </button>
          <div className="w-px h-4 mx-0.5" style={{ backgroundColor: "var(--color-border)" }} />
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 h-9 px-2 text-sm font-inter transition-colors rounded-lg"
            style={{ color: "var(--color-ink-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-ink)"; e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-muted)"; e.currentTarget.style.backgroundColor = "transparent" }}
          >
            <IconHome />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>

        {/* Center: auto-save status */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-inter select-none min-w-0">
          {dbStatus === "saving" && (
            <>
              <span
                className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
              />
              <span style={{ color: "var(--color-ink-muted)" }}>Saving…</span>
            </>
          )}
          {dbStatus === "saved" && lastSavedTime && (
            <>
              <span style={{ color: "#22c55e" }}><IconCheckCircle /></span>
              <span className="hidden sm:inline" style={{ color: "var(--color-ink-faint)" }}>
                Auto-saved · {lastSavedTime}
              </span>
              <span className="sm:hidden" style={{ color: "var(--color-ink-faint)" }}>Saved</span>
            </>
          )}
          {dbStatus === "error" && (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: "#ef4444", flexShrink: 0 }}>
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <span style={{ color: "#ef4444" }}>Save failed</span>
            </>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 justify-end">
          {/* Coach toggle — desktop only */}
          {onToggleCoach && (
            <button
              onClick={onToggleCoach}
              title={showCoach ? "Close Coach" : "Open Coach"}
              className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-inter font-medium transition-colors"
              style={{
                backgroundColor: showCoach ? "var(--color-accent)" : "var(--color-surface-2)",
                color:           showCoach ? "#ffffff"              : "var(--color-ink-muted)",
                border:          showCoach ? "none"                 : "1px solid var(--color-border)",
              }}
              onMouseEnter={(e) => { if (!showCoach) { e.currentTarget.style.backgroundColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-ink)" } }}
              onMouseLeave={(e) => { if (!showCoach) { e.currentTarget.style.backgroundColor = "var(--color-surface-2)"; e.currentTarget.style.color = "var(--color-ink-muted)" } }}
            >
              <IconSparkles />
              Coach
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="Delete entry"
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#ef4444" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <IconTrash />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-lg text-sm font-inter font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "var(--color-accent)" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}
          >
            {saving ? "Saving…" : "Save entry"}
          </button>
        </div>
      </header>

      {/* ── Formatting toolbar ─────────────────────────────────────────── */}
      <div
        className="sticky top-14 z-10 flex items-center gap-0.5 px-3 py-2 border-b overflow-x-auto"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Text formatting */}
        <TBtn onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold") ?? false} title="Bold (⌘B)">
          <IconBold />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic") ?? false} title="Italic (⌘I)">
          <IconItalic />
        </TBtn>

        <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: "var(--color-border)" }} />

        <TBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor?.isActive("heading", { level: 1 }) ?? false} title="Heading 1">
          <IconH1 />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive("heading", { level: 2 }) ?? false} title="Heading 2">
          <IconH2 />
        </TBtn>

        <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: "var(--color-border)" }} />

        <TBtn onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList") ?? false} title="Bullet list">
          <IconBulletList />
        </TBtn>
        <TBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList") ?? false} title="Numbered list">
          <IconOrderedList />
        </TBtn>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Voice dictation */}
        {dictationAvailable && (
          <button
            onClick={isRecording || isTranscribing ? undefined : handleDictateClick}
            disabled={isTranscribing}
            title={isRecording ? "Recording — use the panel to stop" : isTranscribing ? "Transcribing…" : "Voice dictation"}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-inter font-medium transition-colors flex-shrink-0"
            style={{
              backgroundColor: (isRecording || isTranscribing) ? "rgba(239,68,68,0.1)" : "var(--color-surface-2)",
              color: (isRecording || isTranscribing) ? "#ef4444" : "var(--color-ink-muted)",
              border: `1px solid ${(isRecording || isTranscribing) ? "rgba(239,68,68,0.35)" : "var(--color-border)"}`,
              cursor: (isRecording || isTranscribing) ? "default" : "pointer",
            }}
            onMouseEnter={(e) => { if (!isRecording && !isTranscribing) e.currentTarget.style.backgroundColor = "var(--color-border)" }}
            onMouseLeave={(e) => { if (!isRecording && !isTranscribing) e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
          >
            <IconMic active={isRecording || isTranscribing} />
            <span>{isRecording ? "Recording…" : isTranscribing ? "…" : "Dictate"}</span>
          </button>
        )}

        {/* Grammar check */}
        <button
          onClick={runGrammarCheck}
          disabled={grammarLoading}
          title="Grammar & spelling check"
          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-inter font-medium transition-colors disabled:opacity-40 flex-shrink-0 ml-1"
          style={{
            backgroundColor: grammarResult ? "var(--color-accent)" : "var(--color-surface-2)",
            color: grammarResult ? "#ffffff" : "var(--color-ink-muted)",
            border: `1px solid ${grammarResult ? "var(--color-accent)" : "var(--color-border)"}`,
          }}
          onMouseEnter={(e) => { if (!grammarResult) e.currentTarget.style.backgroundColor = "var(--color-border)" }}
          onMouseLeave={(e) => { if (!grammarResult) e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
        >
          {grammarLoading
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <IconSparkles />
          }
          <span>Grammar</span>
        </button>

        {/* Habits shortcut */}
        <button
          onClick={() => {
            const next = !showHabits
            setShowHabits(next)
            // If opening habits, close coach so they don't compete for the right panel
            if (next && showCoach && onToggleCoach) onToggleCoach()
            // Mirror to mobile tab
            setMobileTab(next ? "habits" : "write")
          }}
          title={showHabits ? "Close habits" : "View habits"}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-inter font-medium transition-colors flex-shrink-0 ml-1"
          style={{
            backgroundColor: (showHabits || mobileTab === "habits") ? "var(--color-accent)" : "var(--color-surface-2)",
            color:           (showHabits || mobileTab === "habits") ? "#ffffff"              : "var(--color-ink-muted)",
            border:          `1px solid ${(showHabits || mobileTab === "habits") ? "var(--color-accent)" : "var(--color-border)"}`,
          }}
          onMouseEnter={(e) => { if (!showHabits && mobileTab !== "habits") { e.currentTarget.style.backgroundColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-ink)" } }}
          onMouseLeave={(e) => { if (!showHabits && mobileTab !== "habits") { e.currentTarget.style.backgroundColor = "var(--color-surface-2)"; e.currentTarget.style.color = "var(--color-ink-muted)" } }}
        >
          <IconCheckCircle />
          <span>Habits</span>
        </button>

        {/* ── Media attach ── */}
        <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: "var(--color-border)" }} />
        <button
          onClick={() => entryId ? fileInputRef.current?.click() : undefined}
          disabled={!entryId}
          title={entryId ? "Attach photo or video" : "Entry saves automatically — media unlocks in a moment"}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-inter font-medium transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "var(--color-surface-2)",
            color: "var(--color-ink-muted)",
            border: "1px solid var(--color-border)",
          }}
          onMouseEnter={(e) => { if (entryId) e.currentTarget.style.backgroundColor = "var(--color-border)" }}
          onMouseLeave={(e) => { if (entryId) e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
        >
          <IconPhoto />
          <span className="hidden sm:inline">Media</span>
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          aria-label="Attach photos or videos"
          onChange={handleFileSelect}
        />
      </div>

      {/* ── Writing canvas — left-aligned, comfortable reading width ─── */}
      <div className="w-full max-w-3xl">

      {/* ── Draft recovery banner (new entries only) ───────────────────── */}
      {draftBanner && (
        <div
          className="mx-4 mt-3 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-inter"
          style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
        >
          <span className="flex-1" style={{ color: "var(--color-ink-muted)" }}>
            You have an unsaved draft from{" "}
            <span style={{ color: "var(--color-ink)" }}>
              {new Date(draftBanner.savedAt).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })}
            </span>
          </span>
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: "var(--color-accent)" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}
            onClick={() => {
              if (editor) {
                editor.commands.setContent(draftBanner.content)
                setTitle(draftBanner.title)
              }
              setDraftBanner(null)
            }}
          >
            Restore
          </button>
          <button
            className="text-xs flex-shrink-0 transition-colors"
            style={{ color: "var(--color-ink-faint)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-ink)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}
            onClick={() => {
              try { localStorage.removeItem(draftKey) } catch { /* */ }
              setDraftBanner(null)
            }}
          >
            Discard
          </button>
        </div>
      )}

      {/* ── Daily prompt banner ─────────────────────────────────────────── */}
      {activePrompt && (
        <div
          className="mx-6 mt-5 px-4 py-3 rounded-xl flex items-start gap-3 text-sm font-inter"
          style={{
            backgroundColor: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderLeft: "3px solid var(--color-accent)",
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-accent)" }}>
              Today&apos;s prompt
            </p>
            <p style={{ color: "var(--color-ink-muted)" }}>{activePrompt}</p>
          </div>
        </div>
      )}

      {/* ── Title + Date + Mood ─────────────────────────────────────────── */}
      <div className="px-6 pt-7 pb-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry title"
          className="w-full bg-transparent focus:outline-none font-sora text-2xl font-semibold text-ink placeholder:text-ink-faint"
        />
      </div>
      <div className="flex items-center justify-between px-6 pb-5 pt-2 gap-3 flex-wrap">
        <p className="text-xs font-inter text-ink-faint">{today}</p>

        {/* Mood picker */}
        <div className="flex items-center gap-1">
          {MOODS.map((m) => {
            const active = mood === m.value
            return (
              <button
                key={m.value}
                onClick={() => setMood(active ? null : m.value)}
                title={m.label}
                aria-label={`Mood: ${m.label}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter transition-all focus:outline-none"
                style={{
                  backgroundColor: active ? `${m.color}20` : "transparent",
                  color: active ? m.color : "var(--color-ink-faint)",
                  border: `1.5px solid ${active ? m.color : "transparent"}`,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = `${m.color}12` }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent" }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: m.color, opacity: active ? 1 : 0.6 }} />
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t" style={{ borderColor: "var(--color-border)" }} />

      {/* ── Editor area ─────────────────────────────────────────────────── */}
      <div className="relative flex-1">
        <EditorContent editor={editor} />
      </div>

      {/* ── Media upload errors ──────────────────────────────────────────── */}
      {mediaErrors.length > 0 && (
        <div className="mx-6 mb-3 space-y-1.5">
          {mediaErrors.map((err, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-inter"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
            >
              <span className="flex-1">{err}</span>
              <button onClick={() => setMediaErrors((p) => p.filter((_, j) => j !== i))}>
                <IconXMark />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Media grid ───────────────────────────────────────────────────── */}
      {(savedMedia.length > 0 || uploadingItems.length > 0) && entryId && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-3">

            {/* Saved items */}
            {savedMedia.map((item, idx) => (
              <div
                key={item.id}
                className="relative group rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                style={{ width: 120, height: 120 }}
                onClick={() => { setLightboxIndex(idx); setCaptionText(item.caption ?? ""); setCaptionStatus("idle") }}
                title="Click to view full size"
              >
                {item.mimeType.startsWith("video/") ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5"
                    style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                    <span style={{ color: "var(--color-ink-muted)" }}><IconVideoCamera /></span>
                    <span className="text-[10px] font-inter px-2 truncate w-full text-center"
                      style={{ color: "var(--color-ink-faint)" }}>
                      {item.fileName}
                    </span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.blobUrl ?? item.storageUrl ?? ""}
                    alt={item.fileName}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Caption indicator dot — always visible when caption exists */}
                {item.caption && (
                  <div
                    className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)" }}
                  >
                    {/* Chat-bubble icon */}
                    <svg viewBox="0 0 12 12" fill="currentColor" width="9" height="9" style={{ color: "rgba(255,255,255,0.8)", flexShrink: 0 }}>
                      <path d="M1 1.5A1.5 1.5 0 0 1 2.5 0h7A1.5 1.5 0 0 1 11 1.5v6A1.5 1.5 0 0 1 9.5 9H5.707L3.354 11.354A.5.5 0 0 1 2.5 11V9H2.5A1.5 1.5 0 0 1 1 7.5v-6Z" />
                    </svg>
                  </div>
                )}

                {/* Hover overlay: expand icon + gradient */}
                <div
                  className="absolute inset-0 flex flex-col justify-between p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.5) 100%)" }}
                >
                  {/* Top row: expand hint + delete */}
                  <div className="flex items-start justify-between">
                    <span className="text-white/80"><IconExpand /></span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteMedia(item.id) }}
                      title="Remove"
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      <IconXMark />
                    </button>
                  </div>
                  {/* Bottom: file size */}
                  <p className="text-[10px] font-inter text-white truncate">
                    {(item.fileSize / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
            ))}

            {/* In-progress uploads */}
            {uploadingItems.map((item) => (
              <div key={item.tempId} className="relative rounded-xl overflow-hidden flex-shrink-0"
                style={{ width: 120, height: 120, border: "1px solid var(--color-border)" }}>
                {item.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--color-surface-2)" }}>
                    <span style={{ color: "var(--color-ink-faint)" }}><IconVideoCamera /></span>
                  </div>
                )}
                {/* Upload spinner overlay */}
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                  <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            ))}

            {/* Add more button (only when entryId exists) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Add more media"
              className="rounded-xl flex-shrink-0 flex flex-col items-center justify-center gap-1 transition-colors"
              style={{
                width: 120, height: 120,
                backgroundColor: "var(--color-surface-2)",
                border: "2px dashed var(--color-border)",
                color: "var(--color-ink-faint)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-border)"
                e.currentTarget.style.color = "var(--color-ink-muted)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                e.currentTarget.style.color = "var(--color-ink-faint)"
              }}
            >
              <IconPhoto />
              <span className="text-[11px] font-inter">Add more</span>
            </button>

          </div>
        </div>
      )}

      </div>{/* end writing canvas */}

      {/* ── Right-side floating panel: dictation + grammar ───────────────── */}
      {/* Mobile only (md:hidden) — on desktop this content moves into the right panel. */}
      {(isRecording || isTranscribing || dictationError || grammarResult) && (
        <div
          className="md:hidden fixed z-[90] right-3 flex flex-col gap-2"
          style={{ top: "7rem", width: 300, maxHeight: "calc(100vh - 8rem)", overflowY: "auto" }}
        >

          {/* ── Microphone error ───────────────────────────────────────── */}
          {dictationError && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm font-inter shadow-lg"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid rgba(239,68,68,0.35)" }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" className="flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }}>
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <p className="flex-1 text-xs font-inter leading-snug" style={{ color: "#ef4444" }}>{dictationError}</p>
              <button
                onClick={() => setDictationError(null)}
                className="flex-shrink-0 transition-colors"
                style={{ color: "rgba(239,68,68,0.5)" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={(e) => e.currentTarget.style.color = "rgba(239,68,68,0.5)"}
              >
                <IconXMark />
              </button>
            </div>
          )}

          {/* ── Recording — waveform + timer ────────────────────────────── */}
          {isRecording && (
            <div
              className="rounded-xl overflow-hidden shadow-lg"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid rgba(239,68,68,0.35)" }}
            >
              {/* Top row: waveform + timer */}
              <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                <div className="flex items-center gap-[3px] flex-shrink-0" style={{ height: 18 }}>
                  {[8, 14, 18, 12, 7].map((h, i) => (
                    <span
                      key={i}
                      className="block rounded-full animate-pulse"
                      style={{
                        width: 3,
                        height: h,
                        backgroundColor: "#ef4444",
                        animationDuration: `${0.65 + i * 0.15}s`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-inter font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-ink-faint)" }}>
                    Recording
                  </p>
                  <p className="text-xs font-inter font-medium tabular-nums" style={{ color: "#ef4444" }}>
                    {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}
                  </p>
                </div>
              </div>
              {/* Stop button */}
              <button
                onClick={stopDictation}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-inter font-semibold transition-colors"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", borderTop: "1px solid rgba(239,68,68,0.2)" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.18)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <rect x="4" y="4" width="12" height="12" rx="2" />
                </svg>
                Stop Recording
              </button>
            </div>
          )}

          {/* ── Transcribing — spinner ───────────────────────────────────── */}
          {isTranscribing && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--color-accent)" }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-inter font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-ink-faint)" }}>
                  Transcribing
                </p>
                <p className="text-xs font-inter font-medium" style={{ color: "var(--color-ink)" }}>
                  Converting speech to text…
                </p>
              </div>
            </div>
          )}

          {/* ── Grammar results ─────────────────────────────────────────── */}
          {grammarResult && (
            <div
              className="rounded-xl overflow-hidden shadow-lg"
              style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b"
                style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-center gap-1.5">
                  {grammarResult.matches.length === 0
                    ? <span style={{ color: "#22c55e" }}><IconCheckCircle /></span>
                    : <span style={{ color: "var(--color-accent)" }}><IconSparkles /></span>
                  }
                  <span className="text-xs font-sora font-semibold text-ink">
                    {grammarResult.matches.length === 0 ? "All clear!" : "Grammar Check"}
                  </span>
                  {grammarResult.matches.length > 0 && (
                    <span className="text-[10px] font-inter px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}>
                      {grammarResult.matches.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {grammarResult.matches.some((m) => m.replacements.length > 0) && (
                    <button
                      onClick={applyGrammarFix}
                      className="flex items-center gap-1 text-[10px] font-inter font-semibold px-2 py-1 rounded-md text-white transition-colors"
                      style={{ backgroundColor: "var(--color-accent)" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}
                    >
                      <IconCheck />
                      Apply all
                    </button>
                  )}
                  <button
                    onClick={() => setGrammarResult(null)}
                    title="Dismiss"
                    className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
                    style={{ color: "var(--color-ink-faint)" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-ink)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}
                  >
                    <IconXMark />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-2.5">
                {grammarResult.matches.length === 0 ? (
                  <p className="text-xs font-inter" style={{ color: "#22c55e" }}>
                    No issues — your writing looks great!
                  </p>
                ) : (
                  <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                    {grammarResult.matches.map((m, i) => {
                      const catStyle      = ltCategoryStyle(m.rule.category.id)
                      const before        = m.context.text.slice(0, m.context.offset)
                      const error         = m.context.text.slice(m.context.offset, m.context.offset + m.context.length)
                      const after         = m.context.text.slice(m.context.offset + m.context.length)
                      const topSuggestion = m.replacements[0]?.value
                      return (
                        <li
                          key={i}
                          className="rounded-lg p-2.5 space-y-1.5"
                          style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                        >
                          {/* Badge + actions */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 capitalize leading-tight"
                              style={{ backgroundColor: catStyle.bg, color: catStyle.color }}
                            >
                              {catStyle.label}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {topSuggestion && (
                                <button
                                  onClick={() => applyOneFix(i)}
                                  className="flex items-center gap-0.5 text-[10px] font-inter font-semibold px-1.5 py-0.5 rounded text-white transition-colors"
                                  style={{ backgroundColor: "var(--color-accent)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent-hover)"}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}
                                >
                                  <IconCheck />
                                  Fix
                                </button>
                              )}
                              <button
                                onClick={() => dismissOne(i)}
                                title="Dismiss"
                                className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                                style={{ color: "var(--color-ink-faint)" }}
                                onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-ink)"}
                                onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}
                              >
                                <IconXMark />
                              </button>
                            </div>
                          </div>

                          {/* Context snippet */}
                          <p className="text-[11px] font-inter leading-snug" style={{ color: "var(--color-ink-muted)" }}>
                            <span>{before}</span>
                            <span
                              className="rounded px-0.5 font-semibold"
                              style={{ backgroundColor: `${catStyle.color}25`, color: catStyle.color, textDecoration: "underline wavy" }}
                            >
                              {error}
                            </span>
                            <span>{after}</span>
                          </p>

                          {/* Suggestion */}
                          {topSuggestion && (
                            <p className="text-[11px] font-inter" style={{ color: "var(--color-ink-faint)" }}>
                              → <span className="font-semibold" style={{ color: "#22c55e" }}>{topSuggestion}</span>
                              {m.replacements.length > 1 && (
                                <span> or {m.replacements.slice(1, 3).map((r) => r.value).join(", ")}</span>
                              )}
                            </p>
                          )}

                          {/* Explanation */}
                          <p className="text-[10px] font-inter leading-snug" style={{ color: "var(--color-ink-faint)" }}>
                            {m.shortMessage || m.message}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Media delete confirmation modal ──────────────────────────────── */}
      {mediaDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMediaDeleteConfirm(null)} />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <h2 className="text-base font-sora font-semibold text-ink mb-2">
              Delete this {mediaDeleteConfirm.mimeType.startsWith("video/") ? "video" : "photo"}?
            </h2>
            <p className="text-sm font-inter mb-6" style={{ color: "var(--color-ink-muted)" }}>
              This cannot be undone. The file will be permanently removed from this entry.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMediaDeleteConfirm(null)}
                className="flex-1 h-11 rounded-xl text-sm font-inter font-medium transition-colors"
                style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink)", border: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-border)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMedia}
                disabled={!!mediaDeletingId}
                className="flex-1 h-11 rounded-xl text-sm font-inter font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#ef4444" }}
                onMouseEnter={(e) => !mediaDeletingId && (e.currentTarget.style.backgroundColor = "#dc2626")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ef4444")}
              >
                {mediaDeletingId ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting…
                  </span>
                ) : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && savedMedia[lightboxIndex] && (() => {
        const item = savedMedia[lightboxIndex]
        const isVideo = item.mimeType.startsWith("video/")
        const hasPrev = lightboxIndex > 0
        const hasNext = lightboxIndex < savedMedia.length - 1
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
            onClick={() => setLightboxIndex(null)}
          >
            {/* Main content — stop propagation so clicks on it don't close */}
            <div
              className="relative flex flex-col items-center"
              style={{ maxWidth: "92vw", maxHeight: "92vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setLightboxIndex(null)}
                className="absolute -top-10 right-0 flex items-center gap-1.5 text-sm font-inter text-white/60 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
                Close
              </button>

              {/* Media */}
              {isVideo ? (
                <video
                  key={item.id}
                  src={item.blobUrl ?? item.storageUrl ?? ""}
                  controls
                  autoPlay
                  className="rounded-xl shadow-2xl"
                  style={{ maxWidth: "90vw", maxHeight: "78vh", outline: "none" }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={item.id}
                  src={item.blobUrl ?? item.storageUrl ?? ""}
                  alt={item.fileName}
                  className="rounded-xl shadow-2xl object-contain"
                  style={{ maxWidth: "90vw", maxHeight: "78vh" }}
                  draggable={false}
                />
              )}

              {/* Caption input */}
              <div className="w-full mt-3 px-1">
                <div className="relative">
                  <textarea
                    ref={captionTextareaRef}
                    value={captionText}
                    onChange={(e) => handleCaptionChange(item.id, e.target.value)}
                    onBlur={() => {
                      if (captionTimerRef.current) { clearTimeout(captionTimerRef.current); captionTimerRef.current = null }
                      saveCaption(item.id, captionText)
                    }}
                    placeholder="Add a caption…"
                    rows={1}
                    maxLength={1000}
                    className="w-full text-sm font-inter resize-none focus:outline-none rounded-xl px-3.5 py-2.5 transition-colors placeholder:text-white/25"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#fff",
                      minHeight: 42,
                      overflowY: "hidden",
                    }}
                    onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.28)" }}
                    onBlurCapture={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)" }}
                  />
                  {/* Save status badge */}
                  {captionStatus !== "idle" && (
                    <span
                      className="absolute right-2.5 bottom-2.5 text-[10px] font-inter select-none"
                      style={{
                        color: captionStatus === "saved"  ? "#4ade80"
                             : captionStatus === "saving" ? "rgba(255,255,255,0.4)"
                             : "#f87171",
                      }}
                    >
                      {captionStatus === "saving" ? "Saving…" : captionStatus === "saved" ? "Saved ✓" : "Error"}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom bar: nav + info */}
              <div className="flex items-center justify-between w-full mt-3 px-1 gap-4">
                {/* Prev */}
                <button
                  onClick={() => navigateLightbox(lightboxIndex - 1)}
                  disabled={!hasPrev}
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-colors disabled:opacity-20"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                  onMouseEnter={(e) => { if (hasPrev) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)" }}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
                >
                  <IconChevronLeft />
                </button>

                {/* Info */}
                <div className="text-center flex-1 min-w-0">
                  <p className="text-white text-sm font-inter font-medium truncate">{item.fileName}</p>
                  <p className="text-white/40 text-xs font-inter mt-0.5">
                    {lightboxIndex + 1} / {savedMedia.length}
                    {" · "}
                    {(item.fileSize / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>

                {/* Next */}
                <button
                  onClick={() => navigateLightbox(lightboxIndex + 1)}
                  disabled={!hasNext}
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-colors disabled:opacity-20"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                  onMouseEnter={(e) => { if (hasNext) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)" }}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
                >
                  <IconChevronRight />
                </button>
              </div>
            </div>

            {/* Keyboard hints */}
            {savedMedia.length > 1 && (
              <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/25 text-[11px] font-inter select-none">
                ← → arrow keys to navigate · Esc to close
              </p>
            )}
          </div>
        )
      })()}

      {/* ── Footer: word count + draft status ──────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 border-t"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <p className="text-xs font-inter" style={{ color: "var(--color-ink-faint)" }}>
          {wordCount} {wordCount === 1 ? "word" : "words"}&ensp;·&ensp;{charCount} {charCount === 1 ? "char" : "chars"}
        </p>
        <div className="flex items-center gap-1.5 text-xs font-inter" style={{ color: "var(--color-ink-faint)" }}>
          {dbStatus === "saving" && (
            <>
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Saving…</span>
            </>
          )}
          {dbStatus === "saved" && lastSavedTime && (
            <>
              <IconCheck />
              <span>Saved {lastSavedTime}</span>
            </>
          )}
          {dbStatus === "error" && (
            <span style={{ color: "#ef4444" }}>Save failed — try again</span>
          )}
        </div>
      </div>
    </div>{/* end editor column */}

      {/* ── Desktop right panel — only mounts when something is active ─── */}
      {(isRecording || isTranscribing || dictationError || grammarResult || (showCoach && onToggleCoach) || showHabits) && (
      <div
        className="hidden md:flex flex-col border-l flex-shrink-0 sticky top-0"
        style={{ width: 360, height: "100vh", borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        {/* Grammar / dictation takes over the right panel when active */}
        {(isRecording || isTranscribing || dictationError || grammarResult) ? (
          <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
            {/* Header label */}
            <p className="text-[10px] font-inter font-semibold uppercase tracking-widest px-1 mb-1"
              style={{ color: "var(--color-ink-faint)" }}>
              {grammarResult ? "Grammar Check" : "Voice Dictation"}
            </p>

            {/* Error */}
            {dictationError && (
              <div className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm font-inter"
                style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid rgba(239,68,68,0.35)" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" className="flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }}>
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <p className="flex-1 text-xs font-inter leading-snug" style={{ color: "#ef4444" }}>{dictationError}</p>
                <button onClick={() => setDictationError(null)} className="flex-shrink-0 transition-colors" style={{ color: "rgba(239,68,68,0.5)" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "rgba(239,68,68,0.5)"}>
                  <IconXMark />
                </button>
              </div>
            )}

            {/* Recording — waveform + timer */}
            {isRecording && (
              <div className="rounded-xl overflow-hidden"
                style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid rgba(239,68,68,0.35)" }}>
                {/* Top row: waveform + timer */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <div className="flex items-center gap-[3px] flex-shrink-0" style={{ height: 18 }}>
                    {[8, 14, 18, 12, 7].map((h, i) => (
                      <span key={i} className="block rounded-full animate-pulse"
                        style={{ width: 3, height: h, backgroundColor: "#ef4444", animationDuration: `${0.65 + i * 0.15}s`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-inter font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-ink-faint)" }}>Recording</p>
                    <p className="text-xs font-inter font-medium tabular-nums" style={{ color: "#ef4444" }}>
                      {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}
                    </p>
                  </div>
                </div>
                {/* Stop button */}
                <button onClick={stopDictation}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-inter font-semibold transition-colors"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", borderTop: "1px solid rgba(239,68,68,0.2)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.18)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                    <rect x="4" y="4" width="12" height="12" rx="2" />
                  </svg>
                  Stop Recording
                </button>
              </div>
            )}

            {/* Transcribing — spinner */}
            {isTranscribing && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--color-accent)" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-inter font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-ink-faint)" }}>Transcribing</p>
                  <p className="text-xs font-inter font-medium" style={{ color: "var(--color-ink)" }}>Converting speech to text…</p>
                </div>
              </div>
            )}

            {/* Grammar results */}
            {grammarResult && (
              <div className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface-2)" }}>
                <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center gap-1.5">
                    {grammarResult.matches.length === 0
                      ? <span style={{ color: "#22c55e" }}><IconCheckCircle /></span>
                      : <span style={{ color: "var(--color-accent)" }}><IconSparkles /></span>}
                    <span className="text-xs font-sora font-semibold text-ink">
                      {grammarResult.matches.length === 0 ? "All clear!" : "Grammar Check"}
                    </span>
                    {grammarResult.matches.length > 0 && (
                      <span className="text-[10px] font-inter px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}>
                        {grammarResult.matches.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {grammarResult.matches.some((m) => m.replacements.length > 0) && (
                      <button onClick={applyGrammarFix}
                        className="flex items-center gap-1 text-[10px] font-inter font-semibold px-2 py-1 rounded-md text-white transition-colors"
                        style={{ backgroundColor: "var(--color-accent)" }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}>
                        <IconCheck />Apply all
                      </button>
                    )}
                    <button onClick={() => setGrammarResult(null)} title="Dismiss"
                      className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
                      style={{ color: "var(--color-ink-faint)" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-ink)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}>
                      <IconXMark />
                    </button>
                  </div>
                </div>
                <div className="p-2.5">
                  {grammarResult.matches.length === 0 ? (
                    <p className="text-xs font-inter" style={{ color: "#22c55e" }}>No issues — your writing looks great!</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-[calc(100vh-16rem)] overflow-y-auto">
                      {grammarResult.matches.map((m, i) => {
                        const catStyle      = ltCategoryStyle(m.rule.category.id)
                        const before        = m.context.text.slice(0, m.context.offset)
                        const error         = m.context.text.slice(m.context.offset, m.context.offset + m.context.length)
                        const after         = m.context.text.slice(m.context.offset + m.context.length)
                        const topSuggestion = m.replacements[0]?.value
                        return (
                          <li key={i} className="rounded-lg p-2.5 space-y-1.5"
                            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 capitalize leading-tight"
                                style={{ backgroundColor: catStyle.bg, color: catStyle.color }}>
                                {catStyle.label}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {topSuggestion && (
                                  <button onClick={() => applyOneFix(i)}
                                    className="flex items-center gap-0.5 text-[10px] font-inter font-semibold px-1.5 py-0.5 rounded text-white transition-colors"
                                    style={{ backgroundColor: "var(--color-accent)" }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent-hover)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}>
                                    <IconCheck />Fix
                                  </button>
                                )}
                                <button onClick={() => dismissOne(i)} title="Dismiss"
                                  className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                                  style={{ color: "var(--color-ink-faint)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-ink)"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-ink-faint)"}>
                                  <IconXMark />
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] font-inter leading-snug" style={{ color: "var(--color-ink-muted)" }}>
                              <span>{before}</span>
                              <span className="rounded px-0.5 font-semibold"
                                style={{ backgroundColor: `${catStyle.color}25`, color: catStyle.color, textDecoration: "underline wavy" }}>
                                {error}
                              </span>
                              <span>{after}</span>
                            </p>
                            {topSuggestion && (
                              <p className="text-[11px] font-inter" style={{ color: "var(--color-ink-faint)" }}>
                                → <span className="font-semibold" style={{ color: "#22c55e" }}>{topSuggestion}</span>
                                {m.replacements.length > 1 && (
                                  <span> or {m.replacements.slice(1, 3).map((r) => r.value).join(", ")}</span>
                                )}
                              </p>
                            )}
                            <p className="text-[10px] font-inter leading-snug" style={{ color: "var(--color-ink-faint)" }}>
                              {m.shortMessage || m.message}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : showCoach && onToggleCoach ? (
          <CoachPanel
            entryContent={liveEditorText}
            recentEntries={recentEntries}
            coachContext={coachContext}
            entryId={entryId}
            onClose={onToggleCoach}
            onInsertToEntry={handleInsertToEntry}
          />
        ) : showHabits ? (
          <HabitsPanel />
        ) : null}
      </div>
      )}
    </div>
  )
}
