import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * DELETE /api/entries/bulk-delete
 * Body: { ids: string[] }
 *
 * Deletes all entries whose IDs are in the list AND belong to the
 * authenticated user. IDs that don't match the user are silently ignored
 * (no information leakage).
 */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const ids: unknown = body?.ids

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 })
  }

  // Ensure every element is a non-empty string
  if (!ids.every((id) => typeof id === "string" && id.length > 0)) {
    return NextResponse.json({ error: "All ids must be strings" }, { status: 400 })
  }

  const { count } = await prisma.entry.deleteMany({
    where: {
      id:     { in: ids as string[] },
      userId: session.user.id,          // ownership enforced server-side
    },
  })

  return NextResponse.json({ deleted: count })
}
