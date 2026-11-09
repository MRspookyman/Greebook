import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { FinishedPrecision, Format, Reading, Unit } from './types'

/** Minutes → "3 h 10 min" / "45 min" / "2 h". */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/** "1 día" / "3 días". */
export function formatDays(n: number): string {
  return `${n} ${n === 1 ? 'día' : 'días'}`
}


/** A single position in the reading's unit. */
export function formatUnitValue(unit: Unit, value: number): string {
  switch (unit) {
    case 'pages':
      return `p. ${value}`
    case 'percent':
      return `${value} %`
  }
}

/** Amount of progress in the reading's unit. */
export function formatUnitDelta(unit: Unit, delta: number): string {
  switch (unit) {
    case 'pages':
      return `${delta} ${delta === 1 ? 'página' : 'páginas'}`
    case 'percent':
      return `${delta} %`
  }
}

/** "p. 72 / 340" or "45 %". */
export function formatPosition(r: Pick<Reading, 'unit' | 'current_position' | 'total_units'>): string {
  switch (r.unit) {
    case 'pages':
      return `p. ${r.current_position} / ${r.total_units}`
    case 'percent':
      return `${r.current_position} %`
  }
}

/** Physical page reached, estimated for Kindle percentages; unknown without a page count. */
export function physicalPagePosition(
  reading: Pick<Reading, 'unit' | 'current_position' | 'total_units'> & { book: { page_count: number | null } },
): number | null {
  if (reading.unit === 'pages') return reading.current_position
  if (!reading.book.page_count || reading.total_units <= 0) return null
  return Math.floor((reading.current_position * reading.book.page_count) / reading.total_units)
}

export function progressFraction(r: Pick<Reading, 'current_position' | 'total_units'>): number {
  if (r.total_units <= 0) return 0
  return Math.min(1, Math.max(0, r.current_position / r.total_units))
}

/** On the last page but not marked as read yet: only «Terminar» can move it forward. */
export function atLastPage(r: Pick<Reading, 'status' | 'current_position' | 'total_units'>): boolean {
  return r.status === 'reading' && r.total_units > 0 && r.current_position >= r.total_units
}

/** Whole percent read, rounded down everywhere so 100 % only appears once the book is done. */
export function percentOf(r: Pick<Reading, 'current_position' | 'total_units'>): number {
  return Math.floor(progressFraction(r) * 100)
}

export function formatLabel(format: Format): string {
  return format === 'paper' ? 'Papel' : 'Kindle'
}

export function unitLabel(unit: Unit): string {
  return unit === 'pages' ? 'Páginas' : '%'
}

export function formatFinished(finished_on: string, precision: FinishedPrecision | null): string {
  return format(parseISO(finished_on), precision === 'year' ? 'yyyy' : precision === 'month' ? 'MMMM yyyy' : "d 'de' MMMM 'de' yyyy", { locale: es })
}
