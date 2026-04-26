import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// LanguageTool public REST API — no API key required, trusted open-source
// Docs: https://languagetool.org/http-api/
const LT_ENDPOINT = "https://api.languagetool.org/v2/check"

export interface LTMatch {
  message:      string
  shortMessage: string
  replacements: { value: string }[]
  offset:       number
  length:       number
  context: {
    text:   string
    offset: number
    length: number
  }
  rule: {
    id:          string
    description: string
    category: {
      id:   string
      name: string
    }
  }
}

interface LTResponse {
  matches: LTMatch[]
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { text } = await req.json() as { text?: string }

  if (!text || typeof text !== "string" || text.trim().length < 5) {
    return NextResponse.json({ matches: [], originalText: text ?? "" })
  }

  try {
    const body = new URLSearchParams({
      text,
      language:    "en-US",
      enabledOnly: "false",
    })

    const ltRes = await fetch(LT_ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept":        "application/json",
      },
      body: body.toString(),
      // LanguageTool's free tier can be slow — allow up to 15s
      signal: AbortSignal.timeout(15_000),
    })

    if (!ltRes.ok) {
      return NextResponse.json(
        { matches: [], originalText: text },
        { status: 200 },   // return 200 so the client doesn't error-out
      )
    }

    const data: LTResponse = await ltRes.json()
    return NextResponse.json({ matches: data.matches ?? [], originalText: text })

  } catch (err) {
    // Timeout, network failure, etc. — return empty matches gracefully
    console.error("[grammar] LanguageTool error:", err)
    return NextResponse.json({ matches: [], originalText: text })
  }
}
