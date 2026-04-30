import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deleteMedia } from "@/lib/storage"

type RouteCtx = { params: Promise<{ id: string; mediaId: string }> }

// ── GET /api/entries/[id]/media/[mediaId] ────────────────────────────────────
// Redirects to the Supabase Storage CDN URL so the browser can load the media
// directly.  This keeps API routes out of the hot path for image/video loading.
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { id: entryId, mediaId } = await params

  const media = await prisma.entryMedia.findFirst({
    where:  { id: mediaId, entryId, userId: session.user.id },
    select: { storageUrl: true, mimeType: true, fileName: true },
  })

  if (!media) {
    return new NextResponse("Not found", { status: 404 })
  }

  if (!media.storageUrl) {
    // Legacy row from before the object-storage migration — no bytes to serve
    return new NextResponse("Media not available", { status: 410 })
  }

  // Redirect the browser to the CDN URL — cached by the browser for future loads
  return NextResponse.redirect(media.storageUrl, {
    status: 302,
    headers: {
      // The CDN URL itself is cache-controlled; this redirect need not be cached long
      "Cache-Control": "private, max-age=60",
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
    where:  { id: mediaId, entryId, userId: session.user.id },
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
    where:  { id: mediaId },
    data:   { caption },
    select: {
      id:         true,
      fileName:   true,
      mimeType:   true,
      fileSize:   true,
      caption:    true,
      storageUrl: true,
      createdAt:  true,
    },
  })

  return NextResponse.json(updated)
}

// ── DELETE /api/entries/[id]/media/[mediaId] ─────────────────────────────────
// Removes the file from Supabase Storage, then deletes the DB record.
export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: entryId, mediaId } = await params

  const media = await prisma.entryMedia.findFirst({
    where:  { id: mediaId, entryId, userId: session.user.id },
    select: { id: true, storageUrl: true },
  })

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Delete the object from Supabase Storage first (non-fatal if it fails —
  // the DB record is still removed so the UI stays consistent)
  if (media.storageUrl) {
    try {
      await deleteMedia(media.storageUrl)
    } catch (err) {
      console.error("[media delete] storage error (continuing):", err)
    }
  }

  await prisma.entryMedia.delete({ where: { id: mediaId } })
  return new NextResponse(null, { status: 204 })
}
