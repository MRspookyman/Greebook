import { describe, expect, it } from 'vitest'
import type { ReadingWithBook, Session } from '../types'
import { activityByDay, summarize, timeSpent } from './aggregate'

const range = { from: '2026-11-01', to: '2026-11-30' }

describe('timeSpent', () => {
  it.each([
    {
      label: 'Kindle with recorded minutes counts recorded time',
      unit: 'percent' as const,
      minutes: 25,
      expected: 25,
    },
    {
      label: 'Kindle without recorded minutes adds no time',
      unit: 'percent' as const,
      minutes: null,
      expected: 0,
    },
    {
      label: 'paper without recorded minutes adds no time',
      unit: 'pages' as const,
      minutes: null,
      expected: 0,
    },
  ])('$label', ({ minutes, expected }) => {
    const sessions = [{ reading_id: 'reading', read_on: '2026-11-06', start_pos: 10, end_pos: 70, minutes }]
    expect(timeSpent(sessions, range)).toBe(expected)
  })

  it('excludes sessions outside the selected period', () => {
    const sessions = [{ reading_id: 'reading', read_on: '2026-10-31', start_pos: 0, end_pos: 60, minutes: 30 }]
    expect(timeSpent(sessions, range)).toBe(0)
  })
})

describe('Kindle activity without a page count', () => {
  const reading: ReadingWithBook = {
    id: 'reading', user_id: 'user', book_id: 'book', format: 'ebook', unit: 'percent',
    total_units: 100, current_position: 20, status: 'reading', started_on: '2026-11-06',
    finished_on: null, finished_precision: null, backfilled: false, rating: null, moods: [],
    created_at: '', updated_at: '',
    book: {
      id: 'book', google_id: null, isbn13: null, openlibrary_key: null, title: 'Kindle',
      authors: [], cover_url: null, page_count: null, published_year: null,
      description: null, created_by: 'user', created_at: '',
    },
  }
  const session: Session = {
    id: 'session', reading_id: reading.id, user_id: 'user', read_on: '2026-11-06',
    start_pos: 10, end_pos: 20, minutes: null, created_at: '',
  }

  it('lights the map while keeping page totals and recorded minutes honest', () => {
    expect(activityByDay([session], [reading]).get(session.read_on)).toEqual({
      score: 30, topReadingId: reading.id, readingCount: 1,
    })
    expect(summarize([session], [reading], range)).toEqual({
      pages: 0, readingMinutes: 0, booksFinished: 0, activeDays: 1,
    })
  })

  it('uses actual page estimates instead when the page count is available', () => {
    const knownLength = { ...reading, book: { ...reading.book, page_count: 500 } }
    expect(activityByDay([session], [knownLength]).get(session.read_on)?.score).toBe(50)
    expect(summarize([session], [knownLength], range).pages).toBe(50)
  })
})
