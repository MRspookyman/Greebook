import { describe, expect, it } from 'vitest'
import type { ReadingWithBook } from '@/lib/types'
import { pickerCandidates, pickReading, type PickerFilters } from './pickerModel'

function reading(id: string, pages: number | null, patch: Partial<ReadingWithBook> = {}): ReadingWithBook {
  return {
    id, user_id: 'me', book_id: id, format: 'paper', unit: 'pages',
    total_units: 300, current_position: 0, status: 'want', started_on: null,
    finished_on: null, finished_precision: null, backfilled: false, rating: null,
    moods: [], created_at: '2026-01-01', updated_at: '2026-01-01',
    book: { id, title: id, authors: [], cover_url: null, page_count: pages,
      published_year: null, description: null, google_id: null, isbn13: null,
      openlibrary_key: null, created_by: 'me', created_at: '2026-01-01' },
    ...patch,
  }
}
const defaults: PickerFilters = { length: 'all', format: 'all', origin: 'mine' }

describe('pickerCandidates', () => {
  it('honours exact length boundaries and uses page totals only for page readings', () => {
    const rows = [reading('short', 249), reading('low', 250), reading('high', 450), reading('long', 451), reading('fallback', null), reading('unknown', null, { unit: 'percent', total_units: 100 })]
    expect(pickerCandidates(rows, 'me', 'partner', new Set(), { ...defaults, length: 'short' }).map((row) => row.id)).toEqual(['short'])
    expect(pickerCandidates(rows, 'me', 'partner', new Set(), { ...defaults, length: 'medium' }).map((row) => row.id)).toEqual(['low', 'high', 'fallback'])
    expect(pickerCandidates(rows, 'me', 'partner', new Set(), { ...defaults, length: 'long' }).map((row) => row.id)).toEqual(['long'])
  })
  it('combines own pending, format, recommendations and shared pending filters', () => {
    const mine = reading('mine', 200, { book_id: 'shared', format: 'ebook' })
    const rows = [mine, reading('partner', 200, { user_id: 'partner', book_id: 'shared' }), reading('finished', 200, { status: 'finished' }), reading('other', 200)]
    expect(pickerCandidates(rows, 'me', 'partner', new Set(['shared']), { ...defaults, origin: 'recommended', format: 'ebook' })).toEqual([mine])
    expect(pickerCandidates(rows, 'me', 'partner', new Set(), { ...defaults, origin: 'both' })).toEqual([mine])
    expect(pickerCandidates(rows, 'me', undefined, new Set(), { ...defaults, origin: 'both' })).toEqual([])
  })
  it('deduplicates books without discarding a later format match', () => {
    const rows = [reading('paper', 200, { book_id: 'shared' }), reading('ebook', 200, { book_id: 'shared', format: 'ebook' })]
    expect(pickerCandidates(rows, 'me', undefined, new Set(), defaults)).toHaveLength(1)
    expect(pickerCandidates(rows, 'me', undefined, new Set(), { ...defaults, format: 'ebook' })[0].id).toBe('ebook')
  })
})

describe('pickReading', () => {
  it('handles empty/singleton pools and avoids the previous result where possible', () => {
    const a = reading('a', 200)
    const b = reading('b', 300)
    expect(pickReading([])).toBeNull()
    expect(pickReading([a], 'a')).toBe(a)
    expect(pickReading([a, b], 'a', () => 0)).toBe(b)
    expect(pickReading([a, b], undefined, () => 0.99)).toBe(b)
  })
})
