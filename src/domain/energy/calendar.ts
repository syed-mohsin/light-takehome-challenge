const DAY_MS = 86_400_000

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  )
}

export function addDays(date: string, count: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + count * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

export function daysBetween(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      DAY_MS,
  )
}

export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

export function isWeekend(date: string): boolean {
  return weekday(date) === 0 || weekday(date) === 6
}

export function mondayOf(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7))
}

export function datesInPeriod(start: string, end: string): string[] {
  return Array.from({ length: daysBetween(start, end) + 1 }, (_, i) =>
    addDays(start, i),
  )
}
