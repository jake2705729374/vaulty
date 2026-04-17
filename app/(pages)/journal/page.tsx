"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import LockScreen from "@/components/LockScreen"
import EntryList, { EntryMeta } from "@/components/EntryList"
import JournalEditor from "@/components/JournalEditor"
import { encryptEntry } from "@/lib/crypto"

type View = "list" | "new"

export default function JournalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [masterPassword, setMasterPassword] = useState<string | null>(null)
  const [entries, setEntries] = useState<EntryMeta[]>([])
  const [view, setView] = useState<View>("list")
  const [loadingEntries, setLoadingEntries] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  // Check sessionStorage for password set at login
  useEffect(() => {
    const stored = sessionStorage.getItem("masterPassword")
    if (stored) setMasterPassword(stored)
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true)
    const res = await fetch("/api/entries")
    if (res.ok) {
      const data = await res.json()
      setEntries(data.entries)
    }
    setLoadingEntries(false)
  }, [])

  useEffect(() => {
    if (masterPassword) fetchEntries()
  }, [masterPassword, fetchEntries])

  function handleUnlock(password: string) {
    sessionStorage.setItem("masterPassword", password)
    setMasterPassword(password)
  }

  async function handleSave({
    title,
    content,
    mood,
  }: {
    title: string
    content: string
    mood: string | null
  }) {
    if (!masterPassword) return
    const { ciphertext, iv, salt } = await encryptEntry(content, masterPassword)
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Untitled", ciphertext, iv, salt, mood }),
    })
    if (res.ok) {
      await fetchEntries()
      setView("list")
    }
  }

  if (status === "loading") return null
  if (!masterPassword) return <LockScreen onUnlock={handleUnlock} />

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-lg mx-auto min-h-screen bg-surface shadow-sm">
        {view === "list" && (
          <EntryList
            entries={entries}
            onNewEntry={() => setView("new")}
          />
        )}
        {view === "new" && (
          <JournalEditor
            onSave={handleSave}
            onCancel={() => setView("list")}
          />
        )}
        {loadingEntries && view === "list" && (
          <div className="flex justify-center py-8 text-ink-faint text-sm">Loading…</div>
        )}
      </div>
    </div>
  )
}
