"use client"

import Link from "next/link"

export interface EntryMeta {
  id: string
  title: string
  createdAt: string
  mood?: string | null
}

const MOOD_EMOJI: Record<string, string> = {
  GREAT: "😄",
  GOOD: "🙂",
  OKAY: "😐",
  LOW: "😔",
  AWFUL: "😞",
}

interface EntryListProps {
  entries: EntryMeta[]
  onNewEntry: () => void
}

export default function EntryList({ entries, onNewEntry }: EntryListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <h1 className="text-2xl font-serif font-semibold text-ink">My Journal</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-ink-muted hover:text-ink transition-colors text-xl leading-none"
            aria-label="Settings"
          >
            ⚙
          </Link>
          <button
            onClick={onNewEntry}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white text-xl leading-none transition-colors"
            style={{ backgroundColor: "var(--color-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-accent)")}
            aria-label="New entry"
          >
            +
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 text-ink-faint">
          <p className="text-4xl mb-3">📖</p>
          <p className="text-sm">Your journal is empty.</p>
          <p className="text-sm">Tap + to write your first entry.</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto px-4" style={{ borderColor: "var(--color-border)" }}>
          {entries.map((entry) => (
            <li key={entry.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
              <Link
                href={`/journal/${entry.id}`}
                className="flex items-center justify-between py-4 group"
              >
                <div className="min-w-0">
                  <p className="text-ink font-medium truncate transition-colors group-hover:text-accent">
                    {entry.title || "Untitled"}
                  </p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {entry.mood && (
                  <span className="ml-3 text-lg flex-shrink-0" aria-label={entry.mood}>
                    {MOOD_EMOJI[entry.mood] ?? ""}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
