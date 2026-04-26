export function getStreak(entries: { createdAt: string }[]): number {
  if (!entries.length) return 0
  const days = new Set(
    entries.map((e) => {
      const d = new Date(e.createdAt)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })
  )
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!days.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1)
  let n = 0
  while (days.has(cursor.getTime())) { n++; cursor.setDate(cursor.getDate() - 1) }
  return n
}
