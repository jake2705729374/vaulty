import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

type RouteCtx = { params: Promise<{ id: string; mediaId: string }> }

// ── GET /api/entries/[id]/media/[mediaId] ────────────────────────────────────
// Streams the raw binary so the browser can use it as an <img> or <video> src.
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { id: entryId, mediaId } = await params

  const media = await prisma.entryMedia.findFirst({
    where: { id: mediaId, entryId, userId: session.user.id },
  })

  if (!media) {
    return new NextResponse("Not found", { status: 404 })
  }

  // media.data is a Buffer (Uint8Array subclass) — pass directly as Response body
  return new Response(media.data, {
    headers: {
      "Content-Type":        media.mimeType,
      "Content-Length":      String(media.data.byteLength),
      "Content-Disposition": `inline; filename="${encodeURIComponent(media.fileName)}"`,
      // Cache privately for a year — the ID is stable and the bytes never change
      "Cache-Control":       "private, max-age=31536000, immutable",
    },
  })
}

// ── PATCH /api/entries/[id]/media/[mediaId] ──────────────────────────────────
// Updates the caption on a media item.
// Body: { caption: string | null }
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: entryId, mediaId } = await params

  // Verify ownership
  const media = await prisma.entryMedia.findFirst({
    where: { id: mediaId, entryId, userId: session.user.id },
    select: { id: true },
  })
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  // Allow setting caption to a string or clearing it with null/empty
  const caption: string | null =
    typeof body.caption === "string" && body.caption.trim().length > 0
      ? body.caption.trim()
      : null

  const updated = await prisma.entryMedia.update({
    where: { id: mediaId },
    data:  { caption },
    select: { id: true, fileName: true, mimeType: true, fileSize: true, caption: true, createdAt: true },
  })

  return NextResponse.json(updated)
}

// ── DELETE /api/entries/[id]/media/[mediaId] ─────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: entryId, mediaId } = await params

  const media = await prisma.entryMedia.findFirst({
    where: { id: mediaId, entryId, userId: session.user.id },
    select: { id: true },
  })

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.entryMedia.delete({ where: { id: mediaId } })
  return new NextResponse(null, { status: 204 })
}
