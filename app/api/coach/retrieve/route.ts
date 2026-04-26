import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { anthropic } from "@/lib/ai/claude"

/**
 * POST /api/coach/retrieve
 *
 * Semantic retrieval: given a query and a list of entry excerpts, returns
 * the indices of the top-5 most relevant entries ranked by Claude Haiku.
 *
 * This replaces the client-side TF-IDF keyword scoring with true semantic
 * understanding — without needing embeddings or a vector DB.
 *
 * Body:  { query: string, entries: [{ idx: number, excerpt: string }] }
 * Returns: { indices: number[] }  — up to 5 indices, best-first
 */

interface EntryExcerpt {
  idx:     number
  excerpt: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const query:   string         = body.query   ?? ""
  const entries: EntryExcerpt[] = body.entries ?? []

  if (!query.trim() || !entries.length) {
    return NextResponse.json({ indices: [] })
  }

  // If 5 or fewer entries, no need to rank — return them all in order
  if (entries.length <= 5) {
    return NextResponse.json({ indices: entries.map((e) => e.idx) })
  }

  // Build a compact, numbered list for Claude
  const entryList = entries
    .map((e) => `[${e.idx}] ${e.excerpt.replace(/\s+/g, " ").trim()}`)
    .join("\n")

  try {
    const result = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system:     `You rank journal entry excerpts by relevance to a user's question or topic.
Return the indices of the top 5 most relevant entries as a JSON array, best-first.
Example output: [3, 0, 7, 2, 5]
Return ONLY the JSON array — no explanation, no punctuation outside the array.`,
      messages: [{
        role:    "user",
        content: `User's query: "${query}"\n\nJournal entries:\n${entryList}`,
      }],
    })

    const text  = (result.content[0] as { type: "text"; text: string }).text.trim()
    const match = text.match(/\[\s*[\d,\s]+\s*\]/)

    if (!match) {
      // Fallback: return first 5
      return NextResponse.json({ indices: entries.slice(0, 5).map((e) => e.idx) })
    }

    const indices: number[] = JSON.parse(match[0])
    // Validate: only include indices that actually exist in our entry list
    const validIdxSet = new Set(entries.map((e) => e.idx))
    const validIndices = indices
      .filter((i) => typeof i === "number" && validIdxSet.has(i))
      .slice(0, 5)

    return NextResponse.json({ indices: validIndices })
  } catch {
    // Fallback: return first 5 in original order
    return NextResponse.json({ indices: entries.slice(0, 5).map((e) => e.idx) })
  }
}
