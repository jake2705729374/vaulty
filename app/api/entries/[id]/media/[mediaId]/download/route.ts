import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { downloadMedia } from "@/lib/storage"

type RouteCtx = { params: Promise<{ id: string; mediaId: string }> }

// ── GET /api/entries/[id]/media/[mediaId]/download ────────────────────────────
// Proxy endpoint that fetches the raw (encrypted) bytes from Supabase Storage
// using the service-role key and streams them to the authenticated client.
//
// This removes the dependency on Supabase signed URLs entirely — authentication
// is handled by our own NextAuth session, then the server fetches on behalf of
// the user.  The client still decrypts the bytes with the MEK in-browser, so
// end-to-end encryption is fully preserved.
//
// Response headers:
//   Content-Type:  application/octet-stream
//   Cache-Control: private, max-age=3600  (browser-only, no CDN caching)
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: entryId, mediaId } = await params

  // Verify ownership — entry must belong to this user
  const media = await prisma.entryMedia.findFirst({
    where:  { id: mediaId, entryId, userId: session.user.id },
    select: { storageUrl: true, mimeType: true },
  })

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!media.storageUrl) {
    return NextResponse.json({ error: "Media not available" }, { status: 410 })
  }

  try {
    const bytes = await downloadMedia(media.storageUrl)
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type":  "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[media download] error:", err)
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 502 })
  }
}
