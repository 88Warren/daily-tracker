/**
 * Returns the Monday and Sunday (ISO) for a given week string (e.g. "2025-W34")
 * or the current week if no string is provided.
 */
export function getISOWeekBounds(weekParam?: string): { start: string; end: string } {
  let monday: Date

  if (weekParam) {
    // Parse "2025-W34"
    const match = weekParam.match(/^(\d{4})-W(\d{2})$/)
    if (!match) {
      throw new Error(`Invalid week format: ${weekParam}. Expected YYYY-Www`)
    }
    const year = parseInt(match[1], 10)
    const week = parseInt(match[2], 10)
    monday = isoWeekToDate(year, week)
  } else {
    monday = currentWeekMonday()
  }

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: toISODate(monday),
    end: toISODate(sunday),
  }
}

function currentWeekMonday(): Date {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function isoWeekToDate(year: number, week: number): Date {
  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4)
  const jan4Day = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - (jan4Day - 1) + (week - 1) * 7)
  return monday
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
