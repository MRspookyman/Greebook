import { describe, expect, it } from 'vitest'
import { readingPace } from './readingPace'

const reading = { id: 'r', status: 'reading' as const, total_units: 300, current_position: 100 }
const session = (read_on: string, start_pos = 0, end_pos = 25) => ({ reading_id: 'r', read_on, start_pos, end_pos })

describe('readingPace', () => {
  it('needs two sessions and an unfinished active reading', () => {
    expect(readingPace(reading, [session('2026-11-09')], '2026-11-09')).toBeNull()
    expect(readingPace({ ...reading, status: 'finished' }, [session('2026-11-08'), session('2026-11-09')], '2026-11-09')).toBeNull()
  })
  it('uses active days, not elapsed days, in the last fourteen days', () => {
    expect(readingPace(reading, [session('2026-10-01', 0, 200), session('2026-11-01'), session('2026-11-09')], '2026-11-09')).toEqual({ pace: 25, daysLeft: 8, finish: '2026-11-17' })
  })
  it('counts multiple sessions on one day once', () => {
    expect(readingPace(reading, [session('2026-11-09'), session('2026-11-09')], '2026-11-09')?.pace).toBe(50)
  })
  it('falls back to the whole reading when recent history is sparse', () => {
    expect(readingPace(reading, [session('2026-10-01'), session('2026-11-09')], '2026-11-09')?.pace).toBe(25)
  })
  it('ignores other readings and future sessions and supports percent', () => {
    expect(readingPace({ ...reading, total_units: 100, current_position: 50 }, [session('2026-11-08', 0, 5), session('2026-11-09', 5, 10), { ...session('2026-11-09'), reading_id: 'other' }, session('2026-11-10')], '2026-11-09')?.daysLeft).toBe(10)
  })
})
