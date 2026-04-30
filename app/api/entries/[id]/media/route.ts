import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { uploadMedia, getSignedUrls } from "@/lib/storage"

// 100 MB hard cap — covers high-res photos and short video clips
const MAX_BYTES = 100 * 1024 * 1024

const ALLOWED_MIME_PREFIXES = ["image/", "video/"]

// ── POST /api/entries/[id]/media ─────────────────────────────────────────────
// Accepts multipart/form-data.
//
// Encrypted upload (new — requires MEK on the client):
//   file     — encrypted bytes (application/octet-stream)
//   iv       — base64 AES-GCM IV
//   mimeType — original MIME type (e.g. "image/jpeg") for DB + UI
//   fileName — original file name
//   fileSize — original unencrypted file size in bytes (for display)
//
// Legacy unencrypted upload (fallback, no iv field):
//   file — raw image/video bytes
//
// Uploads the bytes to Supabase Storage (private bucket) and stores the
// storage path + IV in the DB.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: entryId } = await params

  // Verify entry belongs to this user
  const entry = await prisma.entry.findFirst({
    where: { id: entryId, userId: session.user.id },
    select: { id: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  // Parse multipart
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Read optional encryption fields
  const ivField       = formData.get("iv")
  const mimeTypeField = formData.get("mimeType")
  const fileNameField = formData.get("fileName")
  const fileSizeField = formData.get("fileSize")

  const isEncrypted = typeof ivField === "string" && ivField.length > 0

  // Determine MIME type, file name, and original size
  const mimeType = isEncrypted
    ? (typeof mimeTypeField === "string" ? mimeTypeField : "application/octet-stream")
    : file.type
  const fileName = isEncrypted
    ? (typeof fileNameField === "string" ? fileNameField : file.name)
    : file.name
  const fileSize = isEncrypted
    ? (typeof fileSizeField === "string" ? parseInt(fileSizeField, 10) || file.size : file.size)
    : file.size

  // MIME type check (against original type, not the encrypted blob type)
  if (!ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) {
    return NextResponse.json(
      { error: "Only images and videos are allowed" },
      { status: 415 },
    )
  }

  // Size check — use the encrypted file's actual byte size
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_BYTES / 1024 / 1024} MB limit` },
      { status: 413 },
    )
  }

  // Create the DB record first to get a stable mediaId for the storage path
  const media = await prisma.entryMedia.create({
    data: {
      entryId,
      userId:     session.user.id,
      storageUrl: null,           // filled in after upload succeeds
      mediaIv:    isEncrypted ? (ivField as string) : null,
      mimeType,
      fileName,
      fileSize,
    },
    select: { id: true },
  })

  // Upload bytes to Supabase Storage (private bucket)
  let storagePath: string
  try {
    const arrayBuffer = await file.arrayBuffer()
    storagePath = await uploadMedia(arrayBuffer, fileName, session.user.id, media.id)
  } catch (err) {
    // Clean up the orphaned DB record before surfacing the error
    await prisma.entryMedia.delete({ where: { id: media.id } }).catch(() => {})
    console.error("[media upload] storage error:", err)
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 502 },
    )
  }

  // Persist the storage path
  const updated = await prisma.entryMedia.update({
    where:  { id: media.id },
    data:   { storageUrl: storagePath },
    select: {
      id:        true,
      fileName:  true,
      mimeType:  true,
      fileSize:  true,
      caption:   true,
      mediaIv:   true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated, { status: 201 })
}

// ── GET /api/entries/[id]/media ──────────────────────────────────────────────
// Returns metadata list with short-lived signed URLs.
// The client fetches each signed URL, decrypts the bytes with the MEK,
// and creates a local blob URL for display.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: entryId } = await params

  const entry = await prisma.entry.findFirst({
    where: { id: entryId, userId: session.user.id },
    select: { id: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  const rows = await prisma.entryMedia.findMany({
    where: { entryId, userId: session.user.id },
    select: {
      id:         true,
      fileName:   true,
      mimeType:   true,
      fileSize:   true,
      caption:    true,
      storageUrl: true,
      mediaIv:    true,
      createdAt:  true,
    },
    orderBy: { createdAt: "asc" },
  })

  // Generate signed URLs for all items with a storageUrl
  const pathsToSign = rows
    .filter((r) => r.storageUrl)
    .map((r) => r.storageUrl as string)

  const signedMap = pathsToSign.length > 0
    ? await getSignedUrls(pathsToSign).catch(() => ({} as Record<string, string>))
    : {}

  const media = rows.map((r) => ({
    id:        r.id,
    fileName:  r.fileName,
    mimeType:  r.mimeType,
    fileSize:  r.fileSize,
    caption:   r.caption,
    mediaIv:   r.mediaIv,
    signedUrl: r.storageUrl ? (signedMap[r.storageUrl] ?? null) : null,
    createdAt: r.createdAt.toISOString(),
  }))

  return NextResponse.json({ media })
}
