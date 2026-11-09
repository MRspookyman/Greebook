import { describe, expect, it } from 'vitest'
import type { ReadingWithBook } from '../types'
import { readingHabits, readingSpeed, yearDays } from './patterns'

const paper: ReadingWithBook = {
  id: 'paper', user_id: 'user', book_id: 'book', format: 'paper', unit: 'pages',
  total_units: 300, current_position: 0, status: 'reading', started_on: null,
  finished_on: null, finished_precision: null, backfilled: false, rating: null, moods: [],
  created_at: '', updated_at: '',
  book: { id: 'book', google_id: null, isbn13: null, openlibrary_key: null, title: 'Libro',
    authors: [], cover_url: null, page_count: 300, published_year: null, description: null,
    created_by: 'user', created_at: '' },
}
const kindle: ReadingWithBook = { ...paper, id: 'kindle', format: 'ebook', unit: 'percent' }
const session = (reading_id: string, end_pos: number, minutes: number | null) => ({ reading_id, start_pos: 0, end_pos, minutes })

describe('readingSpeed', () => {
  it('uses total pages over total minutes, with independent format samples', () => {
    const speed = readingSpeed([session('paper', 60, 30), session('paper', 30, 60), session('kindle', 10, 30)], [paper, kindle])
    expect(speed.overall.sessions).toBe(3)
    expect(speed.overall.pagesPerHour).toBe(60)
    expect(speed.paper.pagesPerHour).toBe(60)
    expect(speed.ebook.pagesPerHour).toBe(60)
  })
  it('excludes unknown Kindle page counts, untimed sessions, missing readings and nonpositive progress', () => {
    const unknown = { ...kindle, book: { ...kindle.book, page_count: null } }
    expect(readingSpeed([session('kindle', 10, 30), session('paper', 20, null), session('paper', 20, 0), session('missing', 20, 20), session('paper', 0, 20)], [paper, unknown]).overall.sessions).toBe(0)
  })
})

describe('readingHabits', () => {
  it('uses local weekday and hour across UTC midnight', () => {
    const habits = readingHabits([{ started_at: '2026-11-08T23:30:00Z' }], 'Europe/Madrid')
    expect(habits.cells[0][0]).toBe(1)
    expect(habits.dominant).toBe(0)
  })
  it('handles DST in the profile timezone and ignores missing/invalid timestamps', () => {
    const habits = readingHabits([{ started_at: '2026-07-06T18:30:00Z' }, { started_at: null }, {}, { started_at: 'bad' }], 'Europe/Madrid')
    expect(habits.cells[3][0]).toBe(1)
    expect(habits.count).toBe(1)
  })
  it('does not claim a favourite band on a tie', () => {
    expect(readingHabits([{ started_at: '2026-11-09T08:00:00Z' }, { started_at: '2026-11-09T20:00:00Z' }], 'UTC').dominant).toBeNull()
  })
})

describe('yearDays', () => {
  it.each([2024, 2026, 2012])('retains all days of %i, including leap years needing 54 columns', (year) => {
    const days = yearDays(year).flat().filter((day) => day !== null)
    expect(days[0]).toBe(`${year}-01-01`)
    expect(days.at(-1)).toBe(`${year}-12-31`)
    expect(new Set(days).size).toBe(year === 2026 ? 365 : 366)
  })
})
