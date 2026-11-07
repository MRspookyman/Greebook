import { describe, expect, it } from 'vitest'
import { minutesLeft, pagesPerHour, readingMinutes, records, roughDuration, timeOfDay } from './personal'

const paper = { id: 'p', unit: 'pages' as const, current_position: 100, total_units: 400 }
const audio = { id: 'a', unit: 'minutes' as const, current_position: 90, total_units: 600 }
const s = (reading_id: string, start_pos: number, end_pos: number, minutes: number | null) => ({
  reading_id,
  start_pos,
  end_pos,
  minutes,
})

describe('readingMinutes', () => {
  it('adds recorded time and falls back to audio advanced', () => {
    const sessions = [s('p', 0, 40, 60), s('p', 40, 60, null), s('a', 0, 90, null), s('x', 0, 10, 99)]
    expect(readingMinutes(paper, sessions)).toBe(60)
    expect(readingMinutes(audio, sessions)).toBe(90)
  })
})

describe('pagesPerHour', () => {
  it('uses only timed paper sessions', () => {
    const sessions = [s('p', 0, 40, 60), s('p', 40, 100, null), s('a', 0, 30, 30)]
    expect(pagesPerHour([paper, audio], sessions)).toBe(40)
  })

  it('needs at least 10 timed minutes', () => {
    expect(pagesPerHour([paper], [s('p', 0, 5, 5)])).toBeNull()
  })
})

describe('minutesLeft', () => {
  it('is exact for audio', () => {
    expect(minutesLeft(audio, [])).toBe(510)
  })

  it('uses the book pace, then the overall pace', () => {
    expect(minutesLeft(paper, [s('p', 0, 100, 150)])).toBe(450)
    expect(minutesLeft(paper, [], 60)).toBe(300)
    expect(minutesLeft(paper, [])).toBeNull()
  })

  it('is zero once finished', () => {
    expect(minutesLeft({ ...paper, current_position: 400 }, [])).toBe(0)
  })
})

describe('roughDuration', () => {
  it('reads naturally', () => {
    expect(roughDuration(38)).toBe('unos 40 min')
    expect(roughDuration(62)).toBe('una hora')
    expect(roughDuration(150)).toBe('unas 2,5 h')
    expect(roughDuration(800)).toBe('unas 13 h')
  })
})

describe('timeOfDay', () => {
  it('buckets by the hour each session started', () => {
    const at = (h: number, minutes: number) => ({ created_at: new Date(2026, 10, 7, h, 0).toISOString(), minutes })
    const parts = timeOfDay([at(23, 30), at(22, 0), at(10, 60), at(3, 0)])
    expect(parts).toEqual({ morning: 0.25, afternoon: 0, evening: 0.5, night: 0.25 })
    expect(timeOfDay([])).toBeNull()
  })
})

describe('records', () => {
  it('finds personal bests', () => {
    const readings = [
      { id: 'p', unit: 'pages' as const, status: 'finished' as const, started_on: '2026-03-01', finished_on: '2026-03-06', book: { title: 'Nada' } },
      { id: 'q', unit: 'pages' as const, status: 'finished' as const, started_on: '2026-04-01', finished_on: '2026-04-20', book: { title: 'Otro' } },
    ]
    const sessions = [
      { reading_id: 'p', read_on: '2026-03-02', start_pos: 0, end_pos: 40, minutes: 50 },
      { reading_id: 'p', read_on: '2026-03-02', start_pos: 40, end_pos: 70, minutes: 20 },
      { reading_id: 'q', read_on: '2026-04-02', start_pos: 0, end_pos: 50, minutes: 90 },
    ]
    expect(records(sessions, readings)).toEqual({
      longestSession: { minutes: 90, date: '2026-04-02' },
      bestDay: { pages: 70, date: '2026-03-02' },
      fastestBook: { title: 'Nada', days: 6 },
    })
  })
})
