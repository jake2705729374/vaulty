"use client"

import { useEffect, useState, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import JournalEditor from "@/components/JournalEditor"
import LockScreen from "@/components/LockScreen"
import { decryptEntry, encryptEntry } from "@/lib/crypto"

interface EntryData {
  id: string
  title: string
  ciphertext: string
  iv: string
  salt: string
  createdAt: string
  mood: string | null
}

export default function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { status } = useSession()
  const router = useRouter()

  const [masterPassword, setMasterPassword] = useState<string | null>(null)
  const [entry, setEntry] = useState<EntryData | null>(null)
  const [decryptedContent, setDecryptedContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  useEffect(() => {
    const stored = sessionStorage.getItem("masterPassword")
    if (stored) setMasterPassword(stored)
  }, [])

  useEffect(() => {
    if (!masterPassword) return
    setLoading(true)
    fetch(`/api/entries/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found")
        return r.json()
      })
      .then(async (data: EntryData) => {
        setEntry(data)
        const plaintext = await decryptEntry(
          data.ciphertext,
          data.iv,
          data.salt,
          masterPassword
        )
        setDecryptedContent(plaintext)
      })
      .catch(() => setError("Could not load entry. Wrong password or entry not found."))
      .finally(() => setLoading(false))
  }, [id, masterPassword])

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
    await fetch(`/api/entries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Untitled", ciphertext, iv, salt, mood }),
    })
    router.push("/journal")
  }

  async function handleDelete() {
    if (!confirm("Delete this entry? This cannot be undone.")) return
    await fetch(`/api/entries/${id}`, { method: "DELETE" })
    router.push("/journal")
  }

  if (status === "loading" || loading) return null
  if (!masterPassword) return <LockScreen onUnlock={handleUnlock} />

  if (error) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="text-center text-ink-muted">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => router.push("/journal")}
            className="text-accent hover:underline text-sm"
          >
            ← Back to journal
          </button>
        </div>
      </div>
    )
  }

  if (!entry) return null

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-lg mx-auto min-h-screen bg-surface shadow-sm flex flex-col">
        <JournalEditor
          initialTitle={entry.title}
          initialContent={decryptedContent}
          onSave={handleSave}
          onCancel={() => router.push("/journal")}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
