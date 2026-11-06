import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/** Local calendar date as 'yyyy-MM-dd' (the format stored in `read_on`, `started_on`…). */
export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Parses a 'yyyy-MM-dd' string as a local date (midnight local time). */
export function fromISODate(s: string): Date {
  return parseISO(s)
}

/** Spanish formatting helper: `fmt('2026-02-14', "d 'de' MMMM")` → "14 de febrero". */
export function fmt(d: Date | string, pattern: string): string {
  return format(typeof d === 'string' ? fromISODate(d) : d, pattern, { locale: es })
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours()
  if (h >= 6 && h < 13) return 'Buenos días'
  if (h >= 13 && h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}
