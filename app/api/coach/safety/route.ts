import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { anthropic } from "@/lib/ai/claude"

/**
 * POST /api/coach/safety
 *
 * Safety pre-check for coach messages.
 * 1. Regex fast-path: obvious crisis keywords → immediate response (no API call)
 * 2. Elevated-pattern fast-path: if none match → "safe" (no API call, covers 99%+ of messages)
 * 3. Ambiguous: Claude Haiku classifier for contextual understanding
 *
 * Returns: { risk: "safe" | "elevated" | "crisis", response?: string }
 * "elevated" → coach gets an extra care instruction; streaming still proceeds
 * "crisis"   → client shows hardcoded crisis resources; coach API is NOT called
 */

// Patterns that unambiguously indicate crisis — no API needed
const CRISIS_PATTERNS = [
  /\b(kill\s*(my)?self|killing\s*(my)?self)\b/i,
  /\b(suicide|suicidal)\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bend\s+(my\s+life|it\s+all|everything)\b/i,
  /\b(self[-\s]harm|cutting\s*(my)?self|hurt\s*(my)?self)\b/i,
  /\b(overdose|od\s+on)\b/i,
  /\b(no\s+reason\s+to\s+live|not\s+worth\s+living)\b/i,
]

// Patterns that warrant elevated care — trigger API classifier
const ELEVATED_PATTERNS = [
  /\b(hopeless|worthless|pointless|meaningless)\b/i,
  /\bnothing\s+matters\b/i,
  /\bcan'?t\s+(go\s+on|take\s+it|do\s+this\s+anymore)\b/i,
  /\b(nobody|no\s+one)\s+cares\b/i,
  /\b(completely\s+)?alone\s+in\s+this\b/i,
  /\bgive\s+up|giving\s+up\b/i,
  /\b(severe\s+)?depression\b/i,
  /\bpanic\s+attack\b/i,
  /\b(not\s+worth\s+it|no\s+point)\b/i,
  /\bfall\s+apart|falling\s+apart\b/i,
]

const CRISIS_RESPONSE = `I hear that you're going through something really painful right now, and I'm glad you reached out.

Please know that you're not alone — there are people who care and who are trained to help:
• **988 Suicide & Crisis Lifeline**: Call or text **988** (US, free, 24/7)
• **Crisis Text Line**: Text HOME to **741741**
• **International resources**: https://www.iasp.info/resources/Crisis_Centres/

Please reach out to one of these right now. What you're feeling matters, and so do you. 💙`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const message: string = body.message ?? ""

  if (!message.trim()) {
    return NextResponse.json({ risk: "safe" })
  }

  // ── Fast-path: obvious crisis ──────────────────────────────────────────
  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(message)) {
      return NextResponse.json({ risk: "crisis", response: CRISIS_RESPONSE })
    }
  }

  // ── Fast-path: no elevated signals → safe (covers 99%+ of messages) ───
  const hasElevatedSignal = ELEVATED_PATTERNS.some((p) => p.test(message))
  if (!hasElevatedSignal) {
    return NextResponse.json({ risk: "safe" })
  }

  // ── Ambiguous: use Claude Haiku for contextual classification ──────────
  try {
    const result = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 10,
      system:     `You are a safety classifier for a journaling app. Classify the user message below.

CRISIS: expresses suicidal ideation, self-harm intent, or immediate danger to self.
ELEVATED: expresses significant distress, hopelessness, or emotional struggle needing extra care.
SAFE: routine emotional content — even sad or frustrated — that a supportive coach can handle normally.

Respond with exactly one word: SAFE, ELEVATED, or CRISIS.`,
      messages: [{ role: "user", content: message }],
    })

    const raw = (result.content[0] as { type: "text"; text: string }).text.trim().toUpperCase()
    const classification = ["SAFE", "ELEVATED", "CRISIS"].includes(raw) ? raw : "SAFE"

    if (classification === "CRISIS") {
      return NextResponse.json({ risk: "crisis", response: CRISIS_RESPONSE })
    }
    if (classification === "ELEVATED") {
      return NextResponse.json({ risk: "elevated" })
    }
    return NextResponse.json({ risk: "safe" })
  } catch {
    // On API error, default to safe so we never block the user from their coach
    return NextResponse.json({ risk: "safe" })
  }
}
