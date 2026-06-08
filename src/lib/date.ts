// Local-date helpers. All keys are `yyyy-mm-dd` in the user's local timezone.

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Returns `n` date keys ending today, ordered oldest → newest. */
export function lastNDays(n: number): string[] {
  const today = new Date()
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    out.push(toDateKey(addDays(today, -i)))
  }
  return out
}

/**
 * Consecutive completed days ending today. A day that is not yet completed
 * does not break the streak (so the count is stable throughout the day).
 */
export function computeStreak(completedDates: string[]): number {
  const set = new Set(completedDates)
  let cursor = new Date()
  if (!set.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -1)
  }
  let streak = 0
  while (set.has(toDateKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Single-letter weekday label (es) for a date key, e.g. "L", "M". */
export function weekdayNarrow(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
    .toLocaleDateString('es-ES', { weekday: 'narrow' })
    .toUpperCase()
}

/** Short human label for a due date, e.g. "08 jun". */
export function formatDueDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })
}

export function isOverdue(dateKey: string): boolean {
  return dateKey < todayKey()
}

export function isToday(dateKey: string): boolean {
  return dateKey === todayKey()
}
