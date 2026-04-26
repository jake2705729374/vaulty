"use client"

import { useEffect, useState, useRef, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import JournalEditor, { type MediaMeta } from "@/components/JournalEditor"
import LockScreen from "@/components/LockScreen"
import {
  encryptEntry, decryptEntry,
  encryptWithMek, decryptWithMek,
  unlockMek, type KeyBundle,
} from "@/lib/crypto"
import PageTransition from "@/components/PageTransition"
import { type CoachContext } from "@/components/CoachPanel"

interface EntryData {
  id:         string
  title:      string
  ciphertext: string
  iv:         string
  salt:       string | null  // null = MEK-encrypted, string = legacy
  createdAt:  string
  mood:       string | null
  media:      MediaMeta[]
}

interface RecentEntryCiphertext {
  ciphertext: string
  iv:         string
  salt:       string | null
}

export default function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { status } = useSession()
  const router = useRouter()

  const [masterPassword,   setMasterPassword]   = useState<string | null>(null)
  const [mek,              setMek]              = useState<CryptoKey | null>(null)
  const [entry,            setEntry]            = useState<EntryData | null>(null)
  const [decryptedContent, setDecryptedContent] = useState<string>("")
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState("")

  // ── Coach state ─────────────────────────────────────────────────────────
  const [showCoach,           setShowCoach]           = useState(false)
  const [coachContext,        setCoachContext]        = useState<CoachContext | null>(null)
  const [coachContextEnabled, setCoachContextEnabled] = useState(false)
  const [recentEntries,       setRecentEntries]       = useState<string[]>([])

  const autoSavingRef = useRef(false)

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteInProgress,  setDeleteInProgress]  = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  useEffect(() => {
    const stored = sessionStorage.getItem("masterPassword")
    if (stored) setMasterPassword(stored)
  }, [])

  // ── Load coach context from preferences ──────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/user/preferences")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        const enabled = Boolean(data.coachContextEnabled)
        setCoachContextEnabled(enabled)
        const people      = data.coachPeople     ? JSON.parse(data.coachPeople)     : []
        const lifeCtx     = data.coachLifeContext ? JSON.parse(data.coachLifeContext) : {}
        setCoachContext({
          displayName: data.displayName ?? null,
          people,
          lifePhase:   lifeCtx.phase      ?? null,
          situations:  lifeCtx.situations ?? [],
        })
      })
      .catch(() => { /* non-fatal */ })
  }, [status])

  useEffect(() => {
    if (!masterPassword) return
    setLoading(true)

    // Fetch the entry and the key bundle in parallel — both needed for decryption
    Promise.all([
      fetch(`/api/entries/${id}`).then((r) => {
        if (!r.ok) throw new Error("Not found")
        return r.json() as Promise<EntryData>
      }),
      fetch("/api/user/key-bundle").then((r) =>
        r.ok ? (r.json() as Promise<KeyBundle | null>) : null,
      ),
    ])
      .then(async ([entryData, bundle]) => {
        setEntry({ ...entryData, media: entryData.media ?? [] })

        let resolvedMek: CryptoKey | null = null
        if (bundle) {
          resolvedMek = await unlockMek(masterPassword, bundle)
          setMek(resolvedMek)
        }

        // Decrypt using the appropriate scheme:
        //   • salt present (legacy) → PBKDF2 key derived from password
        //   • salt absent  (MEK)    → decrypt directly with the MEK
        const plaintext = entryData.salt
          ? await decryptEntry(entryData.ciphertext, entryData.iv, entryData.salt, masterPassword)
          : resolvedMek
            ? await decryptWithMek(entryData.ciphertext, entryData.iv, resolvedMek)
            : ""   // should not happen after migration

        setDecryptedContent(plaintext)
      })
      .catch(() => setError("Could not load entry. Wrong password or entry not found."))
      .finally(() => setLoading(false))
  }, [id, masterPassword])

  // ── Load recent entries for coach (when privacy toggle is ON) ─────────────
  useEffect(() => {
    if (!coachContextEnabled || !mek || !masterPassword) return
    fetch("/api/entries/recent?limit=50")
      .then((r) => r.ok ? r.json() : null)
      .then(async (data) => {
        if (!data?.entries) return
        const decrypted = await Promise.all(
          (data.entries as RecentEntryCiphertext[]).map(async (e) => {
            try {
              return e.salt
                ? await decryptEntry(e.ciphertext, e.iv, e.salt, masterPassword!)
                : await decryptWithMek(e.ciphertext, e.iv, mek!)
            } catch { return "" }
          }),
        )
        setRecentEntries(decrypted.filter(Boolean))
      })
      .catch(() => { /* non-fatal */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachContextEnabled, mek])

  function handleUnlock(password: string) {
    sessionStorage.setItem("masterPassword", password)
    setMasterPassword(password)
  }

  // ── Encrypt helper — uses MEK when available, falls back to legacy ────────
  async function encryptContent(content: string): Promise<
    { ciphertext: string; iv: string; salt: string | null }
  > {
    if (mek) {
      const { ciphertext, iv } = await encryptWithMek(content, mek)
      return { ciphertext, iv, salt: null }
    }
    // Legacy fallback (should not happen after migration, but safe)
    const legacy = await encryptEntry(content, masterPassword!)
    return legacy
  }

  // ── Auto-save ────────────────────────────────────────────────────────────
  async function handleAutoSave({
    title, content, mood,
  }: { title: string; content: string; mood: string | null }) {
    if (!masterPassword || autoSavingRef.current) return
    autoSavingRef.current = true
    try {
      const { ciphertext, iv, salt } = await encryptContent(content)
      await fetch(`/api/entries/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title: title || "Untitled", ciphertext, iv, salt, mood }),
      })
    } finally {
      autoSavingRef.current = false
    }
  }

  // ── Manual save ──────────────────────────────────────────────────────────
  async function handleSave({
    title, content, mood,
  }: { title: string; content: string; mood: string | null }) {
    if (!masterPassword) return
    const { ciphertext, iv, salt } = await encryptContent(content)
    await fetch(`/api/entries/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title: title || "Untitled", ciphertext, iv, salt, mood }),
    })
    // Stay in the editor — the header already shows "Auto-saved" status
  }

  function handleDelete() {
    // Skip confirmation for untitled entries with no body text — accidental saves
    // of blank entries shouldn't require an extra tap to clean up.
    const titleIsBlank = !entry?.title?.trim() ||
      entry.title.trim().toLowerCase() === "untitled"
    const bodyIsBlank  = !decryptedContent ||
      decryptedContent.trim() === "" ||
      decryptedContent === "<p></p>"
    if (titleIsBlank && bodyIsBlank) {
      void doDelete()
      return
    }
    setDeleteConfirmOpen(true)
  }

  async function doDelete() {
    setDeleteInProgress(true)
    try {
      await fetch(`/api/entries/${id}`, { method: "DELETE" })
      router.push("/journal")
    } finally {
      setDeleteInProgress(false)
      setDeleteConfirmOpen(false)
    }
  }

  if (status === "loading" || loading) return null
  if (!masterPassword) return <LockScreen onUnlock={handleUnlock} />

  if (error) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-page flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-sm font-inter mb-4" style={{ color: "var(--color-ink-muted)" }}>{error}</p>
            <button
              onClick={() => router.push("/journal")}
              className="text-sm font-inter transition-colors"
              style={{ color: "var(--color-accent)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-accent-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-accent)"}
            >
              ← Back to journal
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (!entry) return null

  return (
    <PageTransition>
      <div className="min-h-screen bg-surface">
        <JournalEditor
          initialTitle={entry.title}
          initialContent={decryptedContent}
          initialMood={entry.mood}
          initialMedia={entry.media}
          entryId={entry.id}
          mek={mek}
          onSave={handleSave}
          onAutoSave={handleAutoSave}
          onCancel={() => router.push("/journal")}
          onDelete={handleDelete}
          draftKey={`journal-draft-${id}`}
          coachContext={coachContext}
          recentEntries={coachContextEnabled ? recentEntries : undefined}
          showCoach={showCoach}
          onToggleCoach={() => setShowCoach((s) => !s)}
        />

        {/* ── Delete confirmation modal ───────────────────────────────────── */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirmOpen(false)} />
            <div
              className="relative w-full max-w-sm rounded-2xl p-6 shadow-xl"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <h2 className="text-base font-sora font-semibold text-ink mb-2">Delete this entry?</h2>
              <p className="text-sm font-inter mb-6" style={{ color: "var(--color-ink-muted)" }}>
                This cannot be undone. Your encrypted entry will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 h-11 rounded-xl text-sm font-inter font-medium transition-colors"
                  style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-ink)", border: "1px solid var(--color-border)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-border)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-2)"}
                >
                  Cancel
                </button>
                <button
                  onClick={doDelete}
                  disabled={deleteInProgress}
                  className="flex-1 h-11 rounded-xl text-sm font-inter font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: "#ef4444" }}
                  onMouseEnter={(e) => !deleteInProgress && (e.currentTarget.style.backgroundColor = "#dc2626")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ef4444")}
                >
                  {deleteInProgress ? (
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
      </div>
    </PageTransition>
  )
}
