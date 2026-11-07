import type { Reading, Unit } from './types'

/** Minutes → "3 h 10 min" / "45 min" / "2 h". */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/** Minutes → "9:30" (input value for audio positions). */
export function toHMM(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

/** "1 día" / "3 días". */
export function formatDays(n: number): string {
  return `${n} ${n === 1 ? 'día' : 'días'}`
}

/** "9:30" → 570, "45" → 45 (plain minutes). Returns null when unparsable. */
export function parseHMM(s: string): number | null {
  const t = s.trim()
  const hm = /^(\d+):([0-5]\d)$/.exec(t)
  if (hm) return Number(hm[1]) * 60 + Number(hm[2])
  if (/^\d+$/.test(t)) return Number(t)
  return null
}

/** A single position in the reading's unit: "p. 72", "45 %", "3 h 10 min". */
export function formatUnitValue(unit: Unit, value: number): string {
  switch (unit) {
    case 'pages':
      return `p. ${value}`
    case 'minutes':
      return formatMinutes(value)
  }
}

/** Amount of progress in the reading's unit: "12 páginas", "5 %", "40 min". */
export function formatUnitDelta(unit: Unit, delta: number): string {
  switch (unit) {
    case 'pages':
      return `${delta} ${delta === 1 ? 'página' : 'páginas'}`
    case 'minutes':
      return formatMinutes(delta)
  }
}

/** "p. 72 / 340", "45 %", "3 h 10 min / 9 h 30 min". */
export function formatPosition(r: Pick<Reading, 'unit' | 'current_position' | 'total_units'>): string {
  switch (r.unit) {
    case 'pages':
      return `p. ${r.current_position} / ${r.total_units}`
    case 'minutes':
      return `${formatMinutes(r.current_position)} / ${formatMinutes(r.total_units)}`
  }
}

export function progressFraction(r: Pick<Reading, 'current_position' | 'total_units'>): number {
  if (r.total_units <= 0) return 0
  return Math.min(1, Math.max(0, r.current_position / r.total_units))
}

/**
 * Text printed in a cover's corner: progress while reading, the rating once finished,
 * where it was left when abandoned. Nothing for books still waiting.
 */
export function coverBadge(
  r: Pick<Reading, 'status' | 'unit' | 'current_position' | 'total_units' | 'rating'>,
): string | undefined {
  switch (r.status) {
    case 'reading':
      return `${Math.round(progressFraction(r) * 100)} %`
    case 'finished':
      return r.rating !== null ? `★ ${r.rating.toLocaleString('es')}` : '✓'
    case 'abandoned':
      return r.unit === 'pages' ? `p. ${r.current_position}` : formatMinutes(r.current_position)
    default:
      return undefined
  }
}
