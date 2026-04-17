import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { anthropic } from "@/lib/ai/claude"
import { THERAPIST_SYSTEM_PROMPT } from "@/lib/ai/prompts"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { message, history = [] } = await req.json()
  if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 })

  const stream = anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: THERAPIST_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      ...history,
      { role: "user" as const, content: message },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      stream.on("text", (text) => {
        controller.enqueue(encoder.encode(text))
      })
      await stream.finalMessage()
      controller.close()
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  })
}
