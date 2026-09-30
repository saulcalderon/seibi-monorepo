/** Calendar-day helpers. A day is `YYYY-MM-DD`; arithmetic runs in UTC. */

const DAY_MS = 86_400_000

export function parseDay(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to) - parseDay(from)) / DAY_MS)
}

export function addDays(day: string, days: number): string {
  return formatDay(parseDay(day) + Math.round(days) * DAY_MS)
}

/** Adds calendar months, clamping to the last day of the target month. */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return formatDay(target.getTime())
}

export function minDay(a: string, b: string): string {
  return a <= b ? a : b
}
