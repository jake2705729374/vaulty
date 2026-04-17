import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { anthropic } from "@/lib/ai/claude"
import { REFLECTION_SYSTEM_PROMPT } from "@/lib/ai/prompts"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { entryText } = await req.json()
  if (!entryText) return NextResponse.json({ error: "Missing entryText" }, { status: 400 })

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 512,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: REFLECTION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Here is the journal entry:\n\n${entryText}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === "text")
  const reflection = textBlock?.type === "text" ? textBlock.text : ""

  return NextResponse.json({ reflection })
}
