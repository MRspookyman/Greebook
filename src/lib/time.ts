/** Dates are local 'yyyy-mm-dd' strings; nothing here depends on a date library. */

const pad = (n: number) => String(n).padStart(2, '0')

export const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local midnight of a 'yyyy-mm-dd' day. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The night turns at 4 a.m.: reading at 00:30 still belongs to the evening before. */
export const NIGHT_TURNS_AT = 4

/** The «night» an instant belongs to. */
export function nightOf(instant: Date): string {
  return isoDate(new Date(instant.getTime() - NIGHT_TURNS_AT * 3_600_000))
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** «10 de noviembre», with the year only when it isn't this one. */
export function fmtDay(day: string, today: string = isoDate(new Date())): string {
  const d = parseDay(day)
  const base = `${d.getDate()} de ${MONTHS[d.getMonth()]}`
  return day.slice(0, 4) === today.slice(0, 4) ? base : `${base} de ${d.getFullYear()}`
}

/** «martes, 10 de noviembre». */
export function fmtToday(now: Date): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`
}

/** «34 min», «1 h», «1 h 05». */
export function fmtMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} min`
  const rest = m % 60
  return rest ? `${Math.floor(m / 60)} h ${pad(rest)}` : `${Math.floor(m / 60)} h`
}

/**
 * The minutes buttons go five by five but land on round numbers: 23 goes down to 20 and up to 25.
 * Anything in between is typed by hand.
 */
export function stepMinutes(value: number, direction: 1 | -1, min = 1, max = 600, step = 5): number {
  const next = direction > 0 ? (Math.floor(value / step) + 1) * step : (Math.ceil(value / step) - 1) * step
  return Math.max(min, Math.min(max, next))
}

/** «ahora mismo», «hace 12 min», «hace 2 h». For how long a candle has been burning. */
export function fmtSince(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'ahora mismo'
  return `hace ${fmtMinutes(minutes)}`
}

/** Whole minutes between two instants, at least 1. */
export function minutesBetween(fromIso: string, to: number): number {
  return Math.max(1, Math.round((to - new Date(fromIso).getTime()) / 60_000))
}

export function greeting(now: Date): string {
  const h = now.getHours()
  if (h >= 6 && h < 13) return 'Buenos días'
  if (h >= 13 && h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}
