"use client"

import { useState } from "react"
import Link from "next/link"
import { getStreak } from "@/lib/streak"

export interface EntryMeta {
  id:        string
  title:     string
  createdAt: string
  mood?:     string | null
}

// ── Mood palette ─────────────────────────────────────────────────────────
const MOOD_META: Record<string, { color: string; label: string }> = {
  GREAT: { color: "#22c55e", label: "Great" },
  GOOD:  { color: "#3b82f6", label: "Good"  },
  OKAY:  { color: "#eab308", label: "Okay"  },
  LOW:   { color: "#f97316", label: "Low"   },
  AWFUL: { color: "#ef4444", label: "Awful" },
}
const MOOD_ORDER = ["GREAT", "GOOD", "OKAY", "LOW", "AWFUL"]

// ── Date helpers ─────────────────────────────────────────────────────────
function formatEntryDate(iso: string): string {
  const date = new Date(iso)
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (diffDays === 0) return `Today · ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
  if (diffDays === 1) return `Yesterday · ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
  if (diffDays < 7)   return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getThisWeekCount(entries: EntryMeta[]): number {
  const cutoff = Date.now() - 7 * 86_400_000
  return entries.filter((e) => new Date(e.createdAt).getTime() > cutoff).length
}

function getMoodCounts(entries: EntryMeta[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((acc, e) => {
    if (e.mood) acc[e.mood] = (acc[e.mood] ?? 0) + 1
    return acc
  }, {})
}

// ── Icons ────────────────────────────────────────────────────────────────
function IconChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  )
}
function IconPlus() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  )
}
function IconCog() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
      <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}
function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}
function IconPencilSquare() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
    </svg>
  )
}
function IconArrowDownTray() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
    </svg>
  )
}

function IconFire() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
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
function IconCheckCircle() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
      <p className="text-xs font-inter uppercase tracking-wider mb-1" style={{ color: "var(--color-ink-faint)" }}>{label}</p>
      <p className="text-2xl font-sora font-bold text-ink leading-none">{value}</p>
      {sub && <p className="text-xs font-inter mt-1" style={{ color: "var(--color-ink-muted)" }}>{sub}</p>}
    </div>
  )
}

interface EntryListProps {
  entries:        EntryMeta[]
  loading?:       boolean
  exporting?:     boolean
  onNewEntry:     () => void
  onExport?:      () => void
  onEntriesChange?: (entries: EntryMeta[]) => void
}

export default function EntryList({
  entries,
  loading    = false,
  exporting  = false,
  onNewEntry,
  onExport,
  onEntriesChange,
}: EntryListProps) {
  const [selectMode,  setSelectMode]  = useState(false)
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [deleting,    setDeleting]    = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const thisWeek   = getThisWeekCount(entries)
  const streak     = getStreak(entries)
  const moodCounts = getMoodCounts(entries)
  const moodEntries = MOOD_ORDER.filter((m) => moodCounts[m])

  // ── Selection helpers ────────────────────────────────────────────────────
  function toggleEntry(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === entries.length) setSelected(new Set())
    else setSelected(new Set(entries.map((e) => e.id)))
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
    setConfirmOpen(false)
  }

  // ── Visible entries (filtered by title search) ───────────────────────────
  const visibleEntries = searchQuery.trim()
    ? entries.filter((e) => e.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : entries

  // ── Bulk delete ──────────────────────────────────────────────────────────
  async function handleBulkDelete() {
    if (selected.size === 0 || deleting) return
    setDeleting(true)
    try {
      const ids = [...selected]
      const res = await fetch("/api/entries/bulk-delete", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids }),
      })
      if (res.ok) {
        const remaining = entries.filter((e) => !selected.has(e.id))
        onEntriesChange?.(remaining)
        exitSelectMode()
      }
    } finally {
      setDeleting(false)
    }
  }

  const allSelected = entries.length > 0 && selected.size === entries.length
  const someSelected = selected.size > 0

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 h-16 border-b"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Left: dashboard link + title OR select-mode info */}
        <div className="flex items-center gap-4">
          {selectMode ? (
            <>
              <button
                onClick={exitSelectMode}
                className="text-sm font-inter h-9 px-3 rounded-lg transition-colors"
                style={{ color: "var(--color-ink-muted)", backgroundColor: "var(--color-surface-2)" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-border)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
              >
                Cancel
              </button>

              <div className="w-px h-5" style={{ backgroundColor: "var(--color-border)" }} />

              <button
                onClick={toggleAll}
                className="text-sm font-inter transition-colors"
                style={{ color: "var(--color-accent)" }}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>

              <span className="text-sm font-inter" style={{ color: "var(--color-ink-muted)" }}>
                {selected.size} selected
              </span>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm font-inter transition-colors h-9 px-2 rounded-lg"
                style={{ color: "var(--color-ink-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-ink)"
                  e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-ink-muted)"
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
              >
                <IconChevronLeft />
                Dashboard
              </Link>

              <div className="w-px h-5" style={{ backgroundColor: "var(--color-border)" }} />

              <Link
                href="/habits"
                className="flex items-center gap-1 text-sm font-inter transition-colors h-9 px-2 rounded-lg"
                style={{ color: "var(--color-ink-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-ink)"
                  e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-ink-muted)"
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
              >
                Habits
              </Link>

              <div className="w-px h-5" style={{ backgroundColor: "var(--color-border)" }} />

              <div>
                <h1 className="text-lg font-sora font-semibold text-ink leading-tight">Journal</h1>
                <p className="text-xs font-inter leading-none" style={{ color: "var(--color-ink-faint)" }}>
                  {loading
                    ? "Loading…"
                    : searchQuery.trim()
                      ? `${visibleEntries.length} of ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
                      : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {selectMode ? (
            /* Delete button — active once at least one entry is selected */
            <button
              onClick={() => someSelected && setConfirmOpen(true)}
              disabled={!someSelected || deleting}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-inter font-semibold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: someSelected ? "#ef4444" : "var(--color-surface-2)",
                       color: someSelected ? "white" : "var(--color-ink-faint)" }}
            >
              <IconTrash />
              Delete{someSelected ? ` (${selected.size})` : ""}
            </button>
          ) : (
            <>
              {onExport && (
                <button
                  onClick={onExport}
                  disabled={exporting || entries.length === 0}
                  title="Export all entries"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-inter transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-border)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
                >
                  {exporting
                    ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <IconArrowDownTray />
                  }
                  <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export"}</span>
                </button>
              )}

              {/* Select button — only shown when there are entries */}
              {entries.length > 0 && !loading && (
                <button
                  onClick={() => setSelectMode(true)}
                  title="Select entries to delete"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-inter transition-colors"
                  style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-border)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
                >
                  <IconCheckCircle />
                  <span className="hidden sm:inline">Select</span>
                </button>
              )}

              <Link
                href="/settings"
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-muted)" }}
                aria-label="Settings"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-ink)"
                  e.currentTarget.style.backgroundColor = "var(--color-border)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-ink-muted)"
                  e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                }}
              >
                <IconCog />
              </Link>
              <button
                onClick={onNewEntry}
                className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-inter font-semibold text-white transition-colors"
                style={{ backgroundColor: "var(--color-accent)" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}
              >
                <IconPlus />
                New entry
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Confirmation dialog ───────────────────────────────────────────── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmOpen(false)}
          />

          {/* Panel */}
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <h2 className="text-base font-sora font-semibold text-ink mb-2">
              Delete {selected.size} {selected.size === 1 ? "entry" : "entries"}?
            </h2>
            <p className="text-sm font-inter mb-6" style={{ color: "var(--color-ink-muted)" }}>
              This cannot be undone. Your encrypted data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 h-11 rounded-xl text-sm font-inter font-medium transition-colors"
                style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink)", border: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-border)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl text-sm font-inter font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#ef4444" }}
                onMouseEnter={(e) => !deleting && (e.currentTarget.style.backgroundColor = "#dc2626")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ef4444")}
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting…
                  </span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body: list + sidebar ─────────────────────────────────────────── */}
      <div className="flex-1 flex gap-0 max-w-screen-xl mx-auto w-full">

        {/* ── Entry list column ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Search bar */}
          {!loading && entries.length > 0 && !selectMode && (
            <div className="px-4 pt-3 pb-1">
              <div className="relative">
                <svg
                  viewBox="0 0 20 20" fill="currentColor"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: "var(--color-ink-faint)" }}
                >
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
                <input
                  type="search"
                  placeholder="Search entries…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-xl text-sm font-inter outline-none transition-all"
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-ink)",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: "var(--color-ink-faint)" }}
                  >✕</button>
                )}
              </div>
            </div>
          )}

          {/* Loading shimmer */}
          {loading && (
            <div className="px-6 pt-6 space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4 px-4 rounded-xl animate-pulse">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--color-border)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 rounded-md" style={{ backgroundColor: "var(--color-surface-2)", width: `${55 + (i * 11) % 35}%` }} />
                    <div className="h-2.5 rounded-md w-32" style={{ backgroundColor: "var(--color-surface-2)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center px-8 py-32">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-faint)" }}
              >
                <IconBook />
              </div>
              <h2 className="text-xl font-sora font-semibold text-ink mb-2">Your journal is empty</h2>
              <p className="text-sm font-inter max-w-xs mb-8" style={{ color: "var(--color-ink-muted)" }}>
                Start capturing your thoughts, reflections, and moments.
              </p>
              <button
                onClick={onNewEntry}
                className="flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-inter font-semibold text-white transition-colors"
                style={{ backgroundColor: "var(--color-accent)" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-accent)"}
              >
                <IconPencilSquare />
                Write your first entry
              </button>
            </div>
          )}

          {/* Empty search state */}
          {!loading && searchQuery && visibleEntries.length === 0 && entries.length > 0 && (
            <div className="flex flex-col items-center justify-center text-center px-8 py-20">
              <p className="text-sm font-inter" style={{ color: "var(--color-ink-muted)" }}>
                No entries found for &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          )}

          {/* Entry rows */}
          {!loading && entries.length > 0 && visibleEntries.length > 0 && (
            <ul className="px-4 py-4">
              {visibleEntries.map((entry) => {
                const moodMeta  = entry.mood ? MOOD_META[entry.mood] : null
                const isChecked = selected.has(entry.id)

                return (
                  <li key={entry.id}>
                    {selectMode ? (
                      /* ── Select mode row: tappable checkbox area ── */
                      <button
                        onClick={() => toggleEntry(entry.id)}
                        className="group w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-colors text-left"
                        style={{ backgroundColor: isChecked ? "var(--color-surface-2)" : "transparent" }}
                        onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = "var(--color-surface-2)" }}
                        onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = "transparent" }}
                      >
                        {/* Checkbox */}
                        <span
                          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors"
                          style={{
                            borderColor: isChecked ? "var(--color-accent)" : "var(--color-border)",
                            backgroundColor: isChecked ? "var(--color-accent)" : "transparent",
                          }}
                        >
                          {isChecked && (
                            <svg viewBox="0 0 12 12" fill="white" width="10" height="10">
                              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          )}
                        </span>

                        {/* Mood dot */}
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: moodMeta ? moodMeta.color : "var(--color-border)" }}
                        />

                        {/* Title + date */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-inter font-medium truncate" style={{ color: "var(--color-ink)" }}>
                            {entry.title || "Untitled"}
                          </p>
                          <p className="text-xs font-inter mt-0.5 flex items-center gap-1.5" style={{ color: "var(--color-ink-faint)" }}>
                            <span>{formatEntryDate(entry.createdAt)}</span>
                            {moodMeta && (
                              <>
                                <span>·</span>
                                <span style={{ color: moodMeta.color }}>{moodMeta.label}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </button>
                    ) : (
                      /* ── Normal mode row: link to entry ── */
                      <Link
                        href={`/journal/${entry.id}`}
                        className="group flex items-center gap-4 px-4 py-4 rounded-xl transition-colors"
                        style={{ backgroundColor: "transparent" }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        {/* Mood dot */}
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
                          style={{ backgroundColor: moodMeta ? moodMeta.color : "var(--color-border)" }}
                        />

                        {/* Title + date */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-inter font-medium truncate transition-colors" style={{ color: "var(--color-ink)" }}>
                            {entry.title || "Untitled"}
                          </p>
                          <p className="text-xs font-inter mt-0.5 flex items-center gap-1.5" style={{ color: "var(--color-ink-faint)" }}>
                            <span>{formatEntryDate(entry.createdAt)}</span>
                            {moodMeta && (
                              <>
                                <span>·</span>
                                <span style={{ color: moodMeta.color }}>{moodMeta.label}</span>
                              </>
                            )}
                          </p>
                        </div>

                        <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--color-ink-faint)" }}>
                          <IconChevronRight />
                        </span>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Stats sidebar ──────────────────────────────────────────────── */}
        {!loading && entries.length > 0 && (
          <aside
            className="hidden lg:flex flex-col gap-4 w-72 xl:w-80 flex-shrink-0 px-5 py-6 border-l"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p className="text-xs font-inter font-semibold uppercase tracking-widest" style={{ color: "var(--color-ink-faint)" }}>
              Overview
            </p>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total" value={entries.length} sub="entries written" />
              <StatCard label="This week" value={thisWeek} sub={thisWeek === 1 ? "entry" : "entries"} />
            </div>

            {/* Streak */}
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              <span
                style={{
                  display: "inline-flex",
                  color: streak > 0 ? "#f97316" : "var(--color-ink-faint)",
                  filter: streak > 0
                    ? "drop-shadow(0 0 6px #f97316) drop-shadow(0 0 12px #fb923c)"
                    : "none",
                }}
              >
                <IconFire />
              </span>
              <div>
                <p className="text-xs font-inter uppercase tracking-wider" style={{ color: "var(--color-ink-faint)" }}>Streak</p>
                <p className="text-xl font-sora font-bold text-ink leading-tight">
                  {streak} {streak === 1 ? "day" : "days"}
                </p>
              </div>
            </div>

            {/* Mood breakdown */}
            {moodEntries.length > 0 && (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
              >
                <p className="text-xs font-inter font-semibold uppercase tracking-widest" style={{ color: "var(--color-ink-faint)" }}>
                  Mood breakdown
                </p>
                {moodEntries.map((moodKey) => {
                  const meta  = MOOD_META[moodKey]
                  const count = moodCounts[moodKey]
                  const pct   = Math.round((count / entries.filter((e) => e.mood).length) * 100)
                  return (
                    <div key={moodKey} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-inter" style={{ color: "var(--color-ink-muted)" }}>{meta.label}</span>
                        <span className="text-xs font-inter font-medium text-ink">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Most recent date */}
            {entries.length > 0 && (
              <p className="text-xs font-inter text-center" style={{ color: "var(--color-ink-faint)" }}>
                Last entry {formatEntryDate(entries[0].createdAt).toLowerCase()}
              </p>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
