import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ColorTheme, DarkMode } from "@prisma/client"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } })

  return NextResponse.json({
    displayName: prefs?.displayName ?? null,
    colorTheme: prefs?.colorTheme ?? ColorTheme.PARCHMENT,
    darkMode: prefs?.darkMode ?? DarkMode.SYSTEM,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const body = await req.json()

  // Only include fields that were actually sent
  const data: {
    displayName?: string | null
    colorTheme?: ColorTheme
    darkMode?: DarkMode
  } = {}

  if ("displayName" in body) data.displayName = body.displayName ?? null
  if ("colorTheme" in body) data.colorTheme = body.colorTheme as ColorTheme
  if ("darkMode" in body) data.darkMode = body.darkMode as DarkMode

  const updated = await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data },
  })

  return NextResponse.json({
    displayName: updated.displayName,
    colorTheme: updated.colorTheme,
    darkMode: updated.darkMode,
  })
}
