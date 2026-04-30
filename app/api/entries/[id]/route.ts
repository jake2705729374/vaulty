import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { EntryBodySchema, MAX_ENTRY_BODY_BYTES, parseBody } from "@/lib/validation"
import { getSignedUrls } from "@/lib/storage"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const entry = await prisma.entry.findFirst({
    where: { id, userId: session.user.id },
    include: {
      moodLog: { select: { mood: true } },
      media: {
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
      },
    },
  })

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Generate signed URLs for all media items in a single batch call.
  // Each signed URL is valid for 1 hour — long enough for any editing session.
  const pathsToSign = entry.media
    .filter((m) => m.storageUrl)
    .map((m) => m.storageUrl as string)

  const signedMap = pathsToSign.length > 0
    ? await getSignedUrls(pathsToSign).catch(() => ({} as Record<string, string>))
    : {}

  return NextResponse.json({
    id:         entry.id,
    title:      entry.title,
    ciphertext: entry.ciphertext,
    iv:         entry.iv,
    salt:       entry.salt,
    createdAt:  entry.createdAt.toISOString(),
    mood:       entry.moodLog?.mood ?? null,
    media: entry.media.map((m) => ({
      id:        m.id,
      fileName:  m.fileName,
      mimeType:  m.mimeType,
      fileSize:  m.fileSize,
      caption:   m.caption,
      mediaIv:   m.mediaIv,
      signedUrl: m.storageUrl ? (signedMap[m.storageUrl] ?? null) : null,
      createdAt: m.createdAt.toISOString(),
    })),
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.entry.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const parsed = parseBody(await req.text(), EntryBodySchema, MAX_ENTRY_BODY_BYTES)
  if (parsed.error) return parsed.error

  const { title, ciphertext, iv, salt = null, mood } = parsed.data

  const entry = await prisma.entry.update({
    where: { id },
    data: {
      title: title ?? "Untitled",
      ciphertext,
      iv,
      salt,
    },
  })

  if (mood) {
    await prisma.moodLog.upsert({
      where:  { entryId: id },
      create: { userId: session.user.id, entryId: id, mood },
      update: { mood },
    })
  } else {
    await prisma.moodLog.deleteMany({ where: { entryId: id } })
  }

  return NextResponse.json({ id: entry.id, updatedAt: entry.updatedAt.toISOString() })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const entry = await prisma.entry.findFirst({ where: { id, userId: session.user.id } })
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.entry.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
