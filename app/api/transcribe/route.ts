import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[transcribe] OPENAI_API_KEY not configured")
    return NextResponse.json({ error: "Transcription service not configured" }, { status: 503 })
  }

  try {
    const formData = await req.formData()
    const audio = formData.get("audio") as File | null

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Lazily import OpenAI so the module doesn't throw at build time when the key is absent
    const { default: OpenAI } = await import("openai")
    const openai = new OpenAI({ apiKey })

    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "en",
    })

    return NextResponse.json({ text: transcription.text })
  } catch (err) {
    console.error("[transcribe]", err)
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 })
  }
}
