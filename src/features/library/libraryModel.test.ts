import { describe, expect, it } from 'vitest'
import type { ReadingWithBook } from '@/lib/types'
import { cardReading, cardTarget, libraryCards } from './libraryModel'

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
