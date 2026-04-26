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
    displayName:         prefs?.displayName         ?? null,
    colorTheme:          prefs?.colorTheme          ?? ColorTheme.PARCHMENT,
    darkMode:            prefs?.darkMode            ?? DarkMode.SYSTEM,
    journalingGoals:     prefs?.journalingGoals     ?? null,
    journalingFrequency: prefs?.journalingFrequency ?? null,
    onboardingDone:      prefs?.onboardingDone      ?? false,
    customTheme:         prefs?.customTheme         ?? null,
    quoteCategories:     prefs?.quoteCategories     ?? null,
    coachContextEnabled: prefs?.coachContextEnabled ?? false,
    coachPeople:         prefs?.coachPeople         ?? null,
    coachLifeContext:    prefs?.coachLifeContext     ?? null,
    userBio:             prefs?.userBio             ?? null,
    coachStyle:          prefs?.coachStyle          ?? "balanced",
    digestEnabled:       prefs?.digestEnabled       ?? false,
    digestDay:           prefs?.digestDay           ?? "sunday",
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
    journalingGoals?: string | null
    journalingFrequency?: string | null
    onboardingDone?: boolean
    customTheme?: string | null
    quoteCategories?: string | null
    coachContextEnabled?: boolean
    coachPeople?: string | null
    coachLifeContext?: string | null
    userBio?: string | null
    coachStyle?: string | null
    digestEnabled?: boolean
    digestDay?: string
  } = {}

  if ("displayName" in body) data.displayName = body.displayName ?? null
  if ("colorTheme" in body) data.colorTheme = body.colorTheme as ColorTheme
  if ("darkMode" in body) data.darkMode = body.darkMode as DarkMode
  if ("journalingGoals" in body) data.journalingGoals = body.journalingGoals ?? null
  if ("journalingFrequency" in body) data.journalingFrequency = body.journalingFrequency ?? null
  if ("onboardingDone" in body) data.onboardingDone = Boolean(body.onboardingDone)
  if ("customTheme" in body) data.customTheme = body.customTheme ?? null
  if ("quoteCategories" in body) data.quoteCategories = body.quoteCategories ?? null
  if ("coachContextEnabled" in body) data.coachContextEnabled = Boolean(body.coachContextEnabled)
  if ("coachPeople" in body) data.coachPeople = body.coachPeople ?? null
  if ("coachLifeContext" in body) data.coachLifeContext = body.coachLifeContext ?? null
  if ("userBio" in body) data.userBio = body.userBio ?? null
  if ("coachStyle" in body) data.coachStyle = body.coachStyle ?? null
  if ("digestEnabled" in body) data.digestEnabled = Boolean(body.digestEnabled)
  if ("digestDay" in body) data.digestDay = body.digestDay ?? "sunday"

  const updated = await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data },
  })

  return NextResponse.json({
    displayName:         updated.displayName,
    colorTheme:          updated.colorTheme,
    darkMode:            updated.darkMode,
    journalingGoals:     updated.journalingGoals,
    journalingFrequency: updated.journalingFrequency,
    onboardingDone:      updated.onboardingDone,
    customTheme:         updated.customTheme,
    quoteCategories:     updated.quoteCategories,
    coachContextEnabled: updated.coachContextEnabled,
    coachPeople:         updated.coachPeople,
    coachLifeContext:    updated.coachLifeContext,
    userBio:             updated.userBio,
    coachStyle:          updated.coachStyle,
    digestEnabled:       updated.digestEnabled,
    digestDay:           updated.digestDay,
  })
}
