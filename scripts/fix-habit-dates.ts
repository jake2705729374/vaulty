/**
 * One-time migration: fix HabitLog dates that were stored as UTC date
 * instead of the user's local date.
 *
 * Affected rows: logs where createdAt UTC hour is 0–7 (= US evening local time)
 * AND date === the UTC date of createdAt (i.e. the bug was active).
 * Fix: subtract 1 day from date so it reflects the correct local date.
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

async function main() {
  const logs = await prisma.habitLog.findMany({
    select: { id: true, date: true, createdAt: true, habitId: true, userId: true },
  })

  const toFix: { id: string; habitId: string; wrongDate: string; correctDate: string }[] = []

  for (const log of logs) {
    const utcHour = log.createdAt.getUTCHours()
    const utcDate = log.createdAt.toISOString().slice(0, 10)

    // Fix logs created between UTC midnight and 7:59am (= US evening)
    if (utcHour >= 0 && utcHour < 8 && log.date === utcDate) {
      const d = new Date(utcDate + "T00:00:00Z")
      d.setUTCDate(d.getUTCDate() - 1)
      const correctDate = d.toISOString().slice(0, 10)
      toFix.push({ id: log.id, habitId: log.habitId, wrongDate: log.date, correctDate })
    }
  }

  console.log(`Found ${toFix.length} log(s) with wrong UTC date:`)
  toFix.forEach(r => console.log(`  id=${r.id}  ${r.wrongDate} → ${r.correctDate}`))

  if (toFix.length === 0) {
    console.log("Nothing to fix.")
    return
  }

  let fixed = 0, skipped = 0

  for (const fix of toFix) {
    // Check for existing correct-date log (unique constraint: habitId_date)
    const conflict = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId: fix.habitId, date: fix.correctDate } },
    })

    if (conflict) {
      // Correct log already exists — delete the wrong duplicate
      await prisma.habitLog.delete({ where: { id: fix.id } })
      console.log(`  ✓ Deleted duplicate ${fix.id} (correct log already at ${fix.correctDate})`)
      skipped++
    } else {
      await prisma.habitLog.update({
        where: { id: fix.id },
        data:  { date: fix.correctDate },
      })
      console.log(`  ✓ Fixed ${fix.id}: ${fix.wrongDate} → ${fix.correctDate}`)
      fixed++
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Deleted duplicates: ${skipped}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
