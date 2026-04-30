"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import LockScreen from "@/components/LockScreen"
import EntryList, { EntryMeta } from "@/components/EntryList"
import JournalEditor from "@/components/JournalEditor"
import {
  encryptEntry, decryptEntry,
  encryptWithMek, decryptWithMek,
  unlockMek, createKeyBundle,
  type KeyBundle,
} from "@/lib/crypto"
import PageTransition from "@/components/PageTransition"
import { type CoachContext } from "@/components/CoachPanel"
import { track } from "@/lib/analytics"

type View = "list" | "new"

export default function JournalPage() {
  const { status } = useSession()
  const router = useRouter()

  const [masterPassword,  setMasterPassword]  = useState<string | null>(null)
  const [passwordChecked, setPasswordChecked] = useState(false)
  const [mek,             setMek]             = useState<CryptoKey | null>(null)
  const [migrating,       setMigrating]       = useState(false)
  const [migrationStatus, setMigrationStatus] = useState("")
  const [migrationError,  setMigrationError]  = useState("")

  const [entries,         setEntries]         = useState<EntryMeta[]>([])
  const [view,            setView]            = useState<View>("list")
  const [loadingEntries,  setLoadingEntries]  = useState(false)
  const [exporting,       setExporting]       = useState(false)
  const [currentEntryId,  setCurrentEntryId]  = useState<string | null>(null)

  // ── Coach state ────────────────────────────────────────────────────────
  const [showCoach,           setShowCoach]           = useState(false)
  const [coachContext,        setCoachContext]        = useState<CoachContext | null>(null)
  const [coachContextEnabled, setCoachContextEnabled] = useState(false)
  const [recentEntries,       setRecentEntries]       = useState<string[]>([])

  // ── Prompt carried in from dashboard ───────────────────────────────────
  const [activePrompt, setActivePrompt] = useState<string | null>(null)

  const newEntryIdRef       = useRef<string | null>(null)
  const savingRef           = useRef(false)
  // Track last saved content so we can auto-delete empty entries on cancel
  const lastSavedTitleRef   = useRef("")
  const lastSavedContentRef = useRef("")

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  // Read sessionStorage + check ?view=new URL param — both in one tick so
  // we never briefly flash LockScreen when navigating from the dashboard.
  useEffect(() => {
    const stored = sessionStorage.getItem("masterPassword")
    if (stored) setMasterPassword(stored)

    const params = new URLSearchParams(window.location.search)
    if (params.get("view") === "new") setView("new")
    const p = params.get("prompt")
    if (p) setActivePrompt(decodeURIComponent(p))

    setPasswordChecked(true)
  }, [])

  // ── Load coach context from preferences ─────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/user/preferences")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        const enabled = Boolean(data.coachContextEnabled)
        setCoachContextEnabled(enabled)
        const people  = data.coachPeople     ? JSON.parse(data.coachPeople)     : []
        const lifeCtx = data.coachLifeContext ? JSON.parse(data.coachLifeContext) : {}
        setCoachContext({
          displayName: data.displayName ?? null,
          people,
          lifePhase:   lifeCtx.phase      ?? null,
          situations:  lifeCtx.situations ?? [],
        })
      })
      .catch(() => { /* non-fatal */ })
  }, [status])

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true)
    const res = await fetch("/api/entries")
    if (res.ok) {
      const data = await res.json()
      setEntries(data.entries)
    }
    setLoadingEntries(false)
  }, [])

  // ── Key bundle / migration ───────────────────────────────────────────────
  // Runs once we know the masterPassword.  Fetches the key bundle and either
  // unlocks the MEK (normal path) or runs the one-time migration (first time
  // after upgrading from per-entry password derivation).
  const initCrypto = useCallback(async (password: string) => {
    try {
      const res    = await fetch("/api/user/key-bundle")
      const bundle = res.ok ? (await res.json() as KeyBundle | null) : null

      if (bundle) {
        // Normal path — derive MEK from password + stored bundle
        const resolvedMek = await unlockMek(password, bundle)
        setMek(resolvedMek)
      } else {
        // One-time migration from legacy per-entry derivation → envelope encryption
        await runMigration(password)
      }
    } catch {
      // Non-fatal — worst case we can't init MEK; writes fall back to legacy
      setMigrationError("Could not initialise encryption. Please refresh and try again.")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runMigration(password: string) {
    setMigrating(true)
    setMigrationError("")
    try {
      // 1. Generate a fresh MEK and wrap it with a KEK derived from the password
      setMigrationStatus("Generating your encryption key…")
      const { mek: newMek, encryptedMek, mekIv, kekSalt } = await createKeyBundle(password)

      // 2. Fetch all existing entries (need full ciphertext for re-encryption)
      setMigrationStatus("Fetching your entries…")
      const exportRes = await fetch("/api/entries/export")
      if (!exportRes.ok) throw new Error("Failed to fetch entries")
      const { entries: raw } = await exportRes.json() as {
        entries: Array<{ id: string; ciphertext: string; iv: string; salt: string | null }>
      }

      // 3. Re-encrypt each entry with the MEK
      setMigrationStatus(`Re-encrypting ${raw.length} ${raw.length === 1 ? "entry" : "entries"}…`)
      const reencrypted = await Promise.all(
        raw.map(async (e) => {
          // Legacy entries always have a salt; MEK-encrypted ones don't
          const plaintext = e.salt
            ? await decryptEntry(e.ciphertext, e.iv, e.salt, password)
            : await decryptWithMek(e.ciphertext, e.iv, newMek)
          const { ciphertext, iv } = await encryptWithMek(plaintext, newMek)
          return { id: e.id, ciphertext, iv }
        }),
      )

      // 4. Send everything to the server in one atomic transaction
      setMigrationStatus("Saving…")
      const migrateRes = await fetch("/api/user/migrate-keys", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ encryptedMek, mekIv, kekSalt, entries: reencrypted }),
      })
      if (!migrateRes.ok) throw new Error("Migration transaction failed")

      setMek(newMek)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setMigrationError(`Encryption upgrade failed: ${msg}. Refresh to retry.`)
    } finally {
      setMigrating(false)
      setMigrationStatus("")
    }
  }

  useEffect(() => {
    if (masterPassword) {
      fetchEntries()
      initCrypto(masterPassword)
    }
  }, [masterPassword, fetchEntries, initCrypto])

  // ── Load recent entries for coach when privacy toggle is ON ──────────────
  useEffect(() => {
    if (!coachContextEnabled || !mek || !masterPassword) return
    fetch("/api/entries/recent?limit=50")
      .then((r) => r.ok ? r.json() : null)
      .then(async (data) => {
        if (!data?.entries) return
        const decrypted = await Promise.all(
          (data.entries as { ciphertext: string; iv: string; salt: string | null }[]).map(async (e) => {
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

  // ── Manual save ──────────────────────────────────────────────────────────
  async function handleSave({
    title, content, mood,
  }: { title: string; content: string; mood: string | null }) {
    if (!masterPassword) return

    lastSavedTitleRef.current   = title
    lastSavedContentRef.current = content

    const encrypted = mek
      ? await encryptWithMek(content, mek)
      : await encryptEntry(content, masterPassword)

    const body = mek
      ? { title: title || "Untitled", ciphertext: encrypted.ciphertext, iv: encrypted.iv, salt: null, mood }
      : { title: title || "Untitled", ...(encrypted as { ciphertext: string; iv: string; salt: string }), mood }

    if (newEntryIdRef.current) {
      await fetch(`/api/entries/${newEntryIdRef.current}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
    } else {
      const res = await fetch("/api/entries", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      if (!res.ok) return
      const data = await res.json()
      const newId = data.id ?? data.entry?.id ?? null
      newEntryIdRef.current = newId
      setCurrentEntryId(newId)
    }
    // Stay in the editor — the header already shows "Auto-saved" status
  }

  // ── Auto-save ────────────────────────────────────────────────────────────
  async function handleAutoSave({
    title, content, mood,
  }: { title: string; content: string; mood: string | null }) {
    if (!masterPassword || savingRef.current) return
    savingRef.current = true

    lastSavedTitleRef.current   = title
    lastSavedContentRef.current = content

    try {
      const encrypted = mek
        ? await encryptWithMek(content, mek)
        : await encryptEntry(content, masterPassword)

      const body = mek
        ? { title: title || "Untitled", ciphertext: encrypted.ciphertext, iv: encrypted.iv, salt: null, mood }
        : { title: title || "Untitled", ...(encrypted as { ciphertext: string; iv: string; salt: string }), mood }

      if (newEntryIdRef.current) {
        await fetch(`/api/entries/${newEntryIdRef.current}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        })
      } else {
        const res = await fetch("/api/entries", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        })
        if (res.ok) {
          const data = await res.json()
          const newId = data.id ?? data.entry?.id ?? null
          newEntryIdRef.current = newId
          setCurrentEntryId(newId)
        }
      }
    } finally {
      savingRef.current = false
    }
  }

  // ── Export ───────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!masterPassword || exporting) return
    setExporting(true)
    try {
      const res = await fetch("/api/entries/export")
      if (!res.ok) return

      const { entries: raw } = await res.json() as {
        entries: Array<{
          id: string; title: string; ciphertext: string; iv: string; salt: string | null
          createdAt: string; updatedAt: string; mood: string | null
        }>
      }

      const decrypted = await Promise.all(
        raw.map(async (e) => {
          try {
            const content = e.salt
              ? await decryptEntry(e.ciphertext, e.iv, e.salt, masterPassword)
              : mek
                ? await decryptWithMek(e.ciphertext, e.iv, mek)
                : "[cannot decrypt — please refresh]"
            return { id: e.id, title: e.title, content, mood: e.mood, createdAt: e.createdAt, updatedAt: e.updatedAt }
          } catch {
            return { id: e.id, title: e.title, content: "[decryption failed]", mood: e.mood, createdAt: e.createdAt, updatedAt: e.updatedAt }
          }
        }),
      )

      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), entries: decrypted }, null, 2)],
        { type: "application/json" },
      )
      const url = URL.createObjectURL(blob)
      const a   = document.createElement("a")
      a.href     = url
      a.download = `journal-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  function handleCancelNew() {
    const id = newEntryIdRef.current

    // Auto-delete if the entry was saved but has no meaningful content
    if (id) {
      const titleEmpty   = !lastSavedTitleRef.current.trim()
      const contentEmpty = !lastSavedContentRef.current.trim() ||
        lastSavedContentRef.current.replace(/<[^>]*>/g, "").trim() === ""
      if (titleEmpty && contentEmpty) {
        // Optimistically remove from list, fire delete in background
        setEntries((prev) => prev.filter((e) => e.id !== id))
        fetch(`/api/entries/${id}`, { method: "DELETE" }).catch(() => {})
      }
    }

    newEntryIdRef.current       = null
    lastSavedTitleRef.current   = ""
    lastSavedContentRef.current = ""
    setCurrentEntryId(null)
    setView("list")
  }

  if (status === "loading" || !passwordChecked) return null
  if (!masterPassword) return <LockScreen onUnlock={handleUnlock} />

  // ── Migration overlay ────────────────────────────────────────────────────
  if (migrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-6">
        <div className="text-center max-w-xs">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-5"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
          <p className="text-sm font-sora font-semibold text-ink mb-1">Upgrading encryption</p>
          <p className="text-xs font-inter text-ink-muted">{migrationStatus || "Please wait…"}</p>
          <p className="text-[11px] font-inter text-ink-faint mt-3">This only happens once.</p>
        </div>
      </div>
    )
  }

  if (migrationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-6">
        <div className="text-center max-w-xs">
          <p className="text-sm font-inter text-red-500 mb-4">{migrationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-inter px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-page">
      {view === "list" ? (
        <div className="min-h-screen">
          <EntryList
            entries={entries}
            loading={loadingEntries}
            exporting={exporting}
            onNewEntry={() => setView("new")}
            onExport={handleExport}
            onEntriesChange={setEntries}
          />
        </div>
      ) : (
        <div className="min-h-screen bg-surface">
          <JournalEditor
            onSave={handleSave}
            onAutoSave={handleAutoSave}
            onCancel={handleCancelNew}
            draftKey="journal-draft-new"
            entryId={currentEntryId}
            mek={mek}
            activePrompt={activePrompt}
            coachContext={coachContext}
            recentEntries={coachContextEnabled ? recentEntries : undefined}
            showCoach={showCoach}
            onToggleCoach={() => { const next = !showCoach; setShowCoach(next); if (next) track("coach_panel_opened", { device: "desktop" }) }}
          />
        </div>
      )}
    </div>
    </PageTransition>
  )
}
