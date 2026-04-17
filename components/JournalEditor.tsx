"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useState } from "react"

const MOOD_OPTIONS = [
  { value: "GREAT", label: "Great", emoji: "😄" },
  { value: "GOOD", label: "Good", emoji: "🙂" },
  { value: "OKAY", label: "Okay", emoji: "😐" },
  { value: "LOW", label: "Low", emoji: "😔" },
  { value: "AWFUL", label: "Awful", emoji: "😞" },
]

interface JournalEditorProps {
  initialTitle?: string
  initialContent?: string
  onSave: (data: { title: string; content: string; mood: string | null }) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

export default function JournalEditor({
  initialTitle = "",
  initialContent = "",
  onSave,
  onCancel,
  onDelete,
}: JournalEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [mood, setMood] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[40vh] focus:outline-none px-4 py-3",
      },
    },
  })

  async function handleSave() {
    if (!editor) return
    setSaving(true)
    await onSave({ title, content: editor.getHTML(), mood })
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-2 border-b border-theme">
        <button onClick={onCancel} className="text-sm text-ink-muted hover:text-ink transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          {onDelete && (
            <button onClick={onDelete} className="text-sm text-red-400 hover:text-red-600">
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-medium text-accent disabled:opacity-40 transition-colors"
            style={{ color: "var(--color-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full px-4 pt-4 pb-1 text-xl font-serif font-semibold text-ink bg-surface placeholder-ink-faint focus:outline-none"
      />

      {/* Date */}
      <p className="px-4 text-xs text-ink-faint mb-2">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {/* Mood picker */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {MOOD_OPTIONS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMood(mood === m.value ? null : m.value)}
            aria-label={m.label}
            className={`text-2xl transition-transform ${
              mood === m.value ? "scale-125" : "opacity-40 hover:opacity-70"
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto border-t border-theme">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
