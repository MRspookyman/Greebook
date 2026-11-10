import { describe, expect, it } from 'vitest'
import type { Book, Quote, ReadingWithBook, Session } from '@/lib/types'
import { bookMemory, buildDiary, yearAgo } from './diary'

const book = (id: string, title: string): Book => ({
  id, title, authors: ['A'], google_id: null, isbn13: null, openlibrary_key: null, cover_url: null, page_count: 300,
  published_year: null, description: null, created_by: 'me', created_at: '2026-01-01T00:00:00Z',
})
const reading = (id: string, user: string, b: Book, patch: Partial<ReadingWithBook> = {}): ReadingWithBook => ({
  id, user_id: user, book_id: b.id, format: 'paper', unit: 'pages', total_units: 300, current_position: 300,
  status: 'finished', started_on: '2026-03-01', finished_on: '2026-03-20', finished_precision: 'day', backfilled: false,
  rating: 4, moods: [], created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-20T10:00:00Z', book: b, ...patch,
})
const session = (id: string, r: ReadingWithBook, read_on: string, start: number, end: number, extra: Partial<Session> = {}): Session => ({
  id, reading_id: r.id, user_id: r.user_id, read_on, start_pos: start, end_pos: end, minutes: 30, created_at: `${read_on}T21:00:00Z`, ...extra,
})

describe('buildDiary', () => {
  const a = book('a', 'Alfa')
  it('joins the same book begun or finished the same day and prefers my reading', () => {
    const months = buildDiary({
      userId: 'me',
      readings: [reading('r2', 'you', a), reading('r1', 'me', a)],
      quotes: [],
      rows: [],
      minutes: new Map(),
    })
    expect(months).toHaveLength(1)
    const finished = months[0].events.find((e) => e.kind === 'finished')!
    expect(finished.who.sort()).toEqual(['me', 'you'])
    expect(finished.readingId).toBe('r1')
    expect(months[0].events.map((e) => e.kind)).toEqual(['finished', 'started'])
  })
  it('leaves out locked and partner-private quotes, and nights nobody timed', () => {
    const quote = (id: string, patch: Partial<Quote>): Quote => ({
      id, user_id: 'you', book_id: 'a', page: 10, kind: 'cita', shared: true, safe: false, opened_early: false, seen_at: null,
      created_at: '2026-04-02T12:00:00Z', locked: false, body: 'Una frase', comment: null, photo_path: null, book: a, ...patch,
    })
    const months = buildDiary({
      userId: 'me',
      readings: [],
      quotes: [quote('q1', {}), quote('q2', { locked: true, body: null }), quote('q3', { shared: false })],
      rows: [
        { id: 't1', user_a: 'me', user_b: 'you', started_at: '2026-04-05T12:00:00Z', ended_at: null, note: 'Sofá' },
        { id: 't2', user_a: 'me', user_b: 'you', started_at: '2026-04-06T12:00:00Z', ended_at: null, note: null },
      ],
      minutes: new Map([['t1', 40]]),
    })
    expect(months[0].events.map((e) => e.key)).toEqual(['night:t1', 'quote:q1'])
  })
  it('skips the start of backfilled history and groups by month, newest first', () => {
    const months = buildDiary({
      userId: 'me',
      readings: [reading('r1', 'me', a, { backfilled: true }), reading('r3', 'me', book('b', 'Beta'), { started_on: '2026-05-02', finished_on: '2026-06-01' })],
      quotes: [],
      rows: [],
      minutes: new Map(),
    })
    expect(months.map((m) => m.month)).toEqual(['2026-06', '2026-05', '2026-03'])
    expect(months[2].events.map((e) => e.kind)).toEqual(['finished'])
  })
})

describe('yearAgo', () => {
  const a = book('a', 'Alfa')
  it('finds a book in progress on this date a year earlier', () => {
    const found = yearAgo([reading('r1', 'you', a, { started_on: '2025-10-20', finished_on: '2025-11-30' })], '2026-11-10', 'me')
    expect(found?.years).toBe(1)
    expect(found?.finishedThen).toBe(false)
  })
  it('says when it was being finished and ignores books without real dates', () => {
    expect(yearAgo([reading('r1', 'me', a, { started_on: '2025-10-01', finished_on: '2025-11-12' })], '2026-11-10', 'me')?.finishedThen).toBe(true)
    expect(yearAgo([reading('r1', 'me', a, { backfilled: true, started_on: '2025-10-01', finished_on: '2025-11-12' })], '2026-11-10', 'me')).toBeNull()
    expect(yearAgo([reading('r1', 'me', a)], '2026-11-10', 'me')).toBeNull()
  })
})

describe('bookMemory', () => {
  it('sums each reader, the curve of the shown reading and the nights side by side', () => {
    const a = book('a', 'Alfa')
    const mine = reading('r1', 'me', a)
    const theirs = reading('r2', 'you', a, { finished_on: '2026-03-25' })
    const memory = bookMemory({
      reading: mine,
      partnerReading: theirs,
      sessions: [
        session('s1', mine, '2026-03-01', 0, 100, { together_id: 't1', place: 'sofá' }),
        session('s2', mine, '2026-03-01', 100, 120),
        session('s3', mine, '2026-03-20', 120, 300),
        session('s4', theirs, '2026-03-01', 0, 50, { together_id: 't1' }),
      ],
      rows: [{ id: 't1', user_a: 'me', user_b: 'you', started_at: '2026-03-01T21:00:00Z', ended_at: null, note: null }],
      minutes: new Map([['t1', 30]]),
      quotes: [],
    })
    expect(memory.people.map((p) => [p.userId, p.days, p.minutes, p.sessions])).toEqual([['me', 20, 90, 3], ['you', 25, 30, 1]])
    expect(memory.curve).toEqual([{ date: '2026-03-01', amount: 120 }, { date: '2026-03-20', amount: 180 }])
    expect([memory.nights, memory.nightMinutes, memory.places]).toEqual([1, 30, ['sofá']])
  })
})
