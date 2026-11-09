import type { Format, ReadingWithBook } from '@/lib/types'

export interface PickerFilters {
  length: 'all' | 'short' | 'medium' | 'long'
  format: Format | 'all'
  origin: 'mine' | 'recommended' | 'both'
}

/** Draw only from my pending readings; never accidentally start my partner's copy. */
export function pickerCandidates(readings: ReadingWithBook[], userId: string, partnerId: string | undefined, recommendedBookIds: ReadonlySet<string>, filters: PickerFilters): ReadingWithBook[] {
  const seen = new Set<string>()
  return readings.filter((reading) => {
    if (reading.user_id !== userId || reading.status !== 'want' || seen.has(reading.book_id)) return false
    if (filters.format !== 'all' && reading.format !== filters.format) return false
    const pages = reading.book.page_count ?? (reading.unit === 'pages' ? reading.total_units : null)
    if (filters.length !== 'all' && (pages === null
      || (filters.length === 'short' && pages >= 250)
      || (filters.length === 'medium' && (pages < 250 || pages > 450))
      || (filters.length === 'long' && pages <= 450))) return false
    if (filters.origin === 'recommended' && !recommendedBookIds.has(reading.book_id)) return false
    if (filters.origin === 'both' && !readings.some((other) => other.user_id === partnerId && other.book_id === reading.book_id && other.status === 'want')) return false
    seen.add(reading.book_id)
    return true
  })
}

export function pickReading(candidates: ReadingWithBook[], previousId?: string, random: () => number = Math.random): ReadingWithBook | null {
  const pool = candidates.length > 1 ? candidates.filter((reading) => reading.id !== previousId) : candidates
  return pool.length ? pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))] : null
}
