import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const year  = parseInt(req.nextUrl.searchParams.get("year")  ?? String(new Date().getFullYear()))
  const month = parseInt(req.nextUrl.searchParams.get("month") ?? String(new Date().getMonth() + 1))
  // tzOffset = -getTimezoneOffset() sent by the client (e.g. -420 for UTC-7, +540 for UTC+9)
  const tzOffset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0")

  // Compute the UTC instants that correspond to local midnight on the 1st of this
  // month and the 1st of the next month.  Formula: localMidnight_UTC = utcMidnight - tzOffset_ms
  const startUtc = new Date(Date.UTC(year, month - 1, 1) - tzOffset * 60_000)
  const endUtc   = new Date(Date.UTC(year, month,     1) - tzOffset * 60_000)

  const entries = await prisma.entry.findMany({
    where: {
      userId:    session.user.id,
      createdAt: { gte: startUtc, lt: endUtc },
      moodLog:   { isNot: null },
    },
    select: {
      id:        true,
      createdAt: true,
      moodLog:   { select: { mood: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  // Convert each entry's UTC timestamp to a local date key, then group by day.
  // Multiple entries on the same local day → latest mood wins (array is asc so
  // later entries overwrite earlier ones).
  const byDate: Record<string, { mood: string; entryId: string }> = {}
  for (const e of entries) {
    // Shift to local time, then read the ISO date string (still in "UTC" form but
    // the shifted value represents the local date correctly).
    const localTs  = e.createdAt.getTime() + tzOffset * 60_000
    const dateKey  = new Date(localTs).toISOString().slice(0, 10) // YYYY-MM-DD local
    if (e.moodLog) {
      byDate[dateKey] = { mood: e.moodLog.mood, entryId: e.id }
    }
  }

  return NextResponse.json({
    year,
    month,
    days: Object.entries(byDate).map(([date, data]) => ({ date, ...data })),
  })
}
