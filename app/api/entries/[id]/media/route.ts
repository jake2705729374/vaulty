import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { uploadMedia } from "@/lib/storage"

// 100 MB hard cap — covers high-res photos and short video clips
const MAX_BYTES = 100 * 1024 * 1024

const ALLOWED_MIME_PREFIXES = ["image/", "video/"]

// ── POST /api/entries/[id]/media ─────────────────────────────────────────────
// Accepts multipart/form-data with a single "file" field.
// Uploads the file to Supabase Storage and stores the CDN URL in the DB.
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

  // MIME type check
  if (!ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
    return NextResponse.json(
      { error: "Only images and videos are allowed" },
      { status: 415 },
    )
  }

  // Size check
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
      mimeType:   file.type,
      fileName:   file.name,
      fileSize:   file.size,
    },
    select: { id: true },
  })

  // Upload file bytes to Supabase Storage
  let storageUrl: string
  try {
    const arrayBuffer = await file.arrayBuffer()
    storageUrl = await uploadMedia(arrayBuffer, file.type, file.name, session.user.id, media.id)
  } catch (err) {
    // Clean up the orphaned DB record before surfacing the error
    await prisma.entryMedia.delete({ where: { id: media.id } }).catch(() => {})
    console.error("[media upload] storage error:", err)
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 502 },
    )
  }

  // Persist the CDN URL
  const updated = await prisma.entryMedia.update({
    where:  { id: media.id },
    data:   { storageUrl },
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

  return NextResponse.json(updated, { status: 201 })
}

// ── GET /api/entries/[id]/media ──────────────────────────────────────────────
// Returns metadata list — no binary data in the response.
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

  const media = await prisma.entryMedia.findMany({
    where: { entryId, userId: session.user.id },
    select: {
      id:         true,
      fileName:   true,
      mimeType:   true,
      fileSize:   true,
      caption:    true,
      storageUrl: true,
      createdAt:  true,
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ media })
}
