import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deleteMedia, getSignedUrls } from "@/lib/storage"

type RouteCtx = { params: Promise<{ id: string; mediaId: string }> }

// ── GET /api/entries/[id]/media/[mediaId] ────────────────────────────────────
// Returns metadata + a short-lived signed URL for fetching the encrypted bytes.
// The client fetches the URL, decrypts with the MEK, then creates a blob URL.
//
// Legacy unencrypted files (mediaIv = null) can be displayed directly from the
// signed URL without any decryption step.
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: entryId, mediaId } = await params

  const media = await prisma.entryMedia.findFirst({
    where:  { id: mediaId, entryId, userId: session.user.id },
    select: { storageUrl: true, mimeType: true, fileName: true, mediaIv: true, fileSize: true, caption: true, createdAt: true },
  })

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!media.storageUrl) {
    return NextResponse.json({ error: "Media not available" }, { status: 410 })
  }

  // Generate a fresh signed URL
  const signedMap = await getSignedUrls([media.storageUrl]).catch(() => ({} as Record<string, string>))
  const signedUrl = signedMap[media.storageUrl] ?? null

  return NextResponse.json({
    id:        mediaId,
    fileName:  media.fileName,
    mimeType:  media.mimeType,
    fileSize:  media.fileSize,
    caption:   media.caption,
    mediaIv:   media.mediaIv,
    signedUrl,
    createdAt: media.createdAt.toISOString(),
  })
}

// ── PATCH /api/entries/[id]/media/[mediaId] ──────────────────────────────────
// Updates the caption on a media item.
// Body: { caption: string | null }
// Captions are AES-256 encrypted client-side (stored as "iv:ciphertext").
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
  const caption: string | null =
    typeof body.caption === "string" && body.caption.trim().length > 0
      ? body.caption.trim()
      : null

  await prisma.entryMedia.update({
    where: { id: mediaId },
    data:  { caption },
  })

  return new NextResponse(null, { status: 204 })
}

// ── DELETE /api/entries/[id]/media/[mediaId] ─────────────────────────────────
// Removes the encrypted file from Supabase Storage, then deletes the DB record.
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

  // Delete the object from Supabase Storage first (non-fatal if it fails)
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
