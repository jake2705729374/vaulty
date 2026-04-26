import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * GET /api/entries/recent?limit=10
 *
 * Returns ciphertext-only payloads for the user's most recent entries.
 * The server never sees plaintext — the client decrypts and passes
 * the plaintext to the coach API when the privacy toggle is enabled.
 *
 * Response: { entries: [{ ciphertext, iv, salt }] }
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url   = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10), 50)

  const entries = await prisma.entry.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take:    limit,
    select:  {
      ciphertext: true,
      iv:         true,
      salt:       true,
    },
  })

  return NextResponse.json({ entries })
}
