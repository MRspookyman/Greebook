import { describe, expect, it } from 'vitest'
import type { Profile, Quote, ReadTogether, ReadingWithBook, Session } from '@/lib/types'
import { summaryYear, yearSummary } from './yearSummary'

const me = { id: 'j', display_name: 'Javier', accent: 'green' } as Profile
const partner = { id: 'g', display_name: 'Gordita', accent: 'blue' } as Profile
const book = (id: string, title: string) => ({ id, title, authors: [], page_count: 300, cover_url: null })
const reading = (id: string, user: string, bookId: string, title: string, extra: Partial<ReadingWithBook> = {}) =>
  ({ id, user_id: user, book_id: bookId, book: book(bookId, title), unit: 'pages', format: 'paper', total_units: 300,
    current_position: 300, status: 'finished', finished_on: '2026-10-01', rating: null, ...extra }) as ReadingWithBook
const session = (id: string, user: string, readingId: string, readOn: string, pages: number) =>
  ({ id, user_id: user, reading_id: readingId, read_on: readOn, start_pos: 0, end_pos: pages, minutes: 30 }) as Session

describe('summaryYear', () => {
  it('keeps showing the year that just ended during January', () => {
    expect(summaryYear('2027-01-15')).toBe('2026')
    expect(summaryYear('2026-11-09')).toBe('2026')
  })
})

describe('yearSummary', () => {
  const readings = [
    reading('r1', 'j', 'b1', 'Klara y el Sol', { rating: 5 }),
    reading('r2', 'g', 'b1', 'Klara y el Sol', { rating: 4 }),
    reading('r3', 'g', 'b2', 'Tokio blues', { rating: 4.5, finished_on: '2026-07-01' }),
    reading('r4', 'g', 'b3', 'Patria', { finished_on: '2025-12-30' }),
  ]
  const sessions = [
    session('s1', 'j', 'r1', '2026-10-01', 40),
    session('s2', 'g', 'r2', '2026-10-01', 60),
    session('s3', 'g', 'r3', '2026-07-01', 30),
    session('s4', 'g', 'r4', '2025-12-30', 99),
  ]
  const rows = [{ id: 't1', started_at: '2026-10-01T21:00:00Z' }] as ReadTogether[]
  const quotes = [
    { id: 'q1', user_id: 'g', book_id: 'b1', body: 'Quizá todos seamos un poco el Sol', shared: true, locked: false,
      created_at: '2026-10-02T10:00:00Z', book: book('b1', 'Klara y el Sol') },
  ] as unknown as Quote[]
  const summary = yearSummary({
    year: '2026', today: '2026-11-09', me, partner, readings, sessions, rows, minutes: new Map([['t1', 45]]),
    quotes, reactions: [], replies: [{ id: 'x', quote_id: 'q1', user_id: 'j', body: 'Sí', seen_at: null, created_at: '' }],
  })

  it('counts distinct books and each one’s books and pages within the year', () => {
    expect(summary.books).toBe(2)
    expect(summary.people.map((p) => [p.person.display_name, p.books, p.pages])).toEqual([
      ['Gordita', 2, 90],
      ['Javier', 1, 40],
    ])
    expect(summary.pages).toBe(130)
  })

  it('finds the days you both read, the time together and the busiest month', () => {
    expect(summary.bothDays).toBe(1)
    expect(summary.minutesTogether).toBe(45)
    expect(summary.topMonth).toEqual({ name: 'octubre', pages: 100 })
    expect(summary.bestStreak).toBe(1)
    expect(summary.partial).toBe(true)
  })

  it('picks the book you both liked most and the quote that sparked conversation', () => {
    expect(summary.favorite).toEqual({ title: 'Klara y el Sol', note: '4,5 de media entre los dos' })
    expect(summary.quote).toEqual({ body: 'Quizá todos seamos un poco el Sol', title: 'Klara y el Sol' })
  })
})
