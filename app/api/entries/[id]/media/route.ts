import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 100 MB hard cap — covers high-res photos and short video clips
const MAX_BYTES = 100 * 1024 * 1024

const ALLOWED_MIME_PREFIXES = ["image/", "video/"]

// ── POST /api/entries/[id]/media ─────────────────────────────────────────────
// Accepts multipart/form-data with a single "file" field.
// Stores raw bytes in Postgres (EntryMedia.data) so that pg_dump / Pi backups
// capture the media automatically alongside the encrypted entry text.
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

  // Read into a Node.js Buffer (stored as Postgres bytea)
  const arrayBuffer = await file.arrayBuffer()
  const data = Buffer.from(arrayBuffer)

  const media = await prisma.entryMedia.create({
    data: {
      entryId,
      userId: session.user.id,
      data,
      mimeType: file.type,
      fileName: file.name,
      fileSize: file.size,
    },
    select: {
      id:        true,
      fileName:  true,
      mimeType:  true,
      fileSize:  true,
      caption:   true,
      createdAt: true,
    },
  })

  return NextResponse.json(media, { status: 201 })
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
    select: { id: true, fileName: true, mimeType: true, fileSize: true, caption: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ media })
}
