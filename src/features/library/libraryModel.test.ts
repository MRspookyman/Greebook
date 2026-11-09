import { describe, expect, it } from 'vitest'
import type { ReadingWithBook } from '@/lib/types'
import { cardFinish, cardReading, cardTarget, finishedGroups, libraryCards } from './libraryModel'

function reading(id: string, patch: Partial<ReadingWithBook> = {}): ReadingWithBook {
  return {
    id, user_id: 'me', book_id: 'shared', format: 'paper', unit: 'pages',
    total_units: 340, current_position: 120, status: 'reading', started_on: null,
    finished_on: null, finished_precision: null, backfilled: false, rating: null,
    moods: [], created_at: '2026-01-01', updated_at: '2026-01-01',
    book: { id: 'shared', title: 'Un libro compartido', authors: ['Laura Pérez'],
      cover_url: null, page_count: 340, published_year: null, description: null,
      google_id: null, isbn13: null, openlibrary_key: null, created_by: 'me', created_at: '2026-01-01' },
    ...patch,
  }
}

describe('libraryCards', () => {
  it('merges people by book and retains each state across shelves', () => {
    const mine = reading('mine')
    const theirs = reading('theirs', { user_id: 'partner', status: 'finished', finished_on: '2025-03-01' })
    const cards = libraryCards([mine, theirs], 'reading')
    expect(cards).toHaveLength(1)
    expect(cardReading(cards[0], 'partner')).toBe(theirs)
    expect(libraryCards([mine, theirs], 'finished')).toHaveLength(1)
    expect(libraryCards([mine, theirs], 'want')).toHaveLength(0)
    expect(libraryCards([mine, theirs], 'reading', 'pérez')).toHaveLength(1)
    expect(libraryCards([mine, theirs], 'finished', 'missing')).toHaveLength(0)
  })

  it('splits rereads by year, merges both finishes in one year, and preserves year-only precision', () => {
    const old = reading('old', { status: 'finished', finished_on: '2024-01-01', finished_precision: 'year', backfilled: true })
    const recent = reading('recent', { status: 'finished', finished_on: '2026-03-01' })
    const partner = reading('partner', { user_id: 'partner', status: 'finished', finished_on: '2026-06-01', format: 'ebook' })
    const cards = libraryCards([old, recent, partner], 'finished')
    expect(cards.map((card) => card.year)).toEqual(['2026', '2024'])
    expect(cards[0].matches).toHaveLength(2)
    expect(cards[0].reading).toBe(partner)
    expect(cards[1].reading.finished_precision).toBe('year')
    expect(libraryCards([old, recent, partner], 'finished', '', 'ebook')).toHaveLength(1)
    expect(libraryCards([old, recent, partner], 'finished', '', 'paper')[0].matches).toEqual([recent])
  })

  it('prefers my tab-matching reading, then latest own reading, even when filtered out', () => {
    const old = reading('old', { updated_at: '2024-01-01' })
    const newer = reading('new', { status: 'want', updated_at: '2026-01-01' })
    const theirs = reading('theirs', { user_id: 'partner', updated_at: '2026-02-01' })
    const card = libraryCards([old, newer, theirs], 'reading')[0]
    expect(cardReading(card, 'me')).toBe(old)
    expect(cardTarget(card, [old, newer, theirs], 'me')).toBe(old)
    const partnerOnly = libraryCards([theirs], 'reading')[0]
    expect(cardTarget(partnerOnly, [newer, theirs], 'me')).toBe(newer)
    expect(cardTarget(partnerOnly, [theirs], 'me')).toBe(theirs)
  })

  it('sorts reading activity newest first and counts duplicate pending books once', () => {
    const older = reading('older')
    const newer = reading('newer', { book_id: 'other', updated_at: '2026-02-01' })
    expect(libraryCards([older, newer], 'reading').map((card) => card.reading.id)).toEqual(['newer', 'older'])
    expect(libraryCards([reading('a', { status: 'want' }), reading('b', { status: 'want', user_id: 'partner' })], 'want')).toHaveLength(1)
  })

  it('retains finished books whose date is unknown without inventing a year', () => {
    const cards = libraryCards([reading('unknown', { status: 'finished' })], 'finished')
    expect(cards).toHaveLength(1)
    expect(cards[0].year).toBe('unknown')
  })
})

describe('finishedGroups', () => {
  function finished(id: string, rating: number | null, date = '2026-06-01', user = 'me') {
    return reading(id, { book_id: id, status: 'finished', finished_on: date, rating, user_id: user })
  }

  it('puts unrated books last and sorts rated ties by recency', () => {
    const cards = libraryCards([finished('unrated', null, '2026-12-01'), finished('old', 4, '2026-01-01'), finished('new', 4)], 'finished')
    expect(finishedGroups(cards, 'average', 'me')[0].cards.map((card) => card.reading.id)).toEqual(['new', 'old', 'unrated'])
  })

  it('uses only active people and averages all visible personal ratings, not book averages', () => {
    const mine = finished('shared', 2)
    const partner = { ...finished('shared', 5, '2026-07-01', 'partner'), id: 'partner' }
    const other = finished('other', 5)
    const group = finishedGroups(libraryCards([mine, partner, other], 'finished'), 'average', 'me', 'partner')[0]
    expect(group.average).toBe(4)
    const filtered = finishedGroups(libraryCards([mine, other], 'finished'), 'average', 'me', 'partner')[0]
    expect(filtered.average).toBe(3.5)
    expect(filtered.cards.map((card) => card.reading.id)).toEqual(['other', 'shared'])
  })

  it('uses latest same-year finish even if an older reread was edited later', () => {
    const old = { ...finished('shared', 5, '2026-01-01'), updated_at: '2026-12-01' }
    const recent = { ...finished('shared', null, '2026-08-01'), id: 'reread' }
    const card = libraryCards([old, recent], 'finished')[0]
    expect(cardFinish(card, 'me')).toBe(recent)
    expect(finishedGroups([card], 'average', 'me')[0].average).toBeNull()
  })

  it('groups descending years with undated last and personal unrated entries by recency', () => {
    const items = [finished('2023', 4, '2023-01-01'), finished('2025', 5, '2025-01-01'),
      finished('old', null, '2026-01-01'), finished('new', null), finished('rated', 1)]
    items.push(reading('unknown', { book_id: 'unknown', status: 'finished' }))
    const groups = finishedGroups(libraryCards(items, 'finished'), 'mine', 'me')
    expect(groups.map((group) => group.year)).toEqual(['2026', '2025', '2023', 'unknown'])
    expect(groups[0].cards.map((card) => card.reading.id)).toEqual(['rated', 'new', 'old'])
  })

  it('sorts by partner rating and Spanish title', () => {
    const a = finished('a', 5)
    const b = finished('b', 2, '2026-07-01', 'partner')
    a.book = { ...a.book, title: 'Zorro' }
    b.book = { ...b.book, title: 'Árbol' }
    const cards = libraryCards([a, b], 'finished')
    expect(finishedGroups(cards, 'partner', 'me', 'partner')[0].cards[0].reading.id).toBe('b')
    expect(finishedGroups(cards, 'title', 'me', 'partner')[0].cards[0].reading.id).toBe('b')
  })
})
