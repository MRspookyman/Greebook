import { describe, expect, it } from 'vitest'
import { sessionGroups } from './sessionGroups'

const readings = [
  { id: 'a', book_id: 'book-a', unit: 'pages' as const },
  { id: 'b', book_id: 'book-b', unit: 'pages' as const },
  { id: 'audio', book_id: 'book-a', unit: 'minutes' as const },
]
const session = (reading_id: string, hour: number, delta: number, day = '2026-11-06') => ({
  reading_id,
  created_at: `${day}T${String(hour).padStart(2, '0')}:00:00Z`,
  read_on: day,
  start_pos: 0,
  end_pos: delta,
})

describe('sessionGroups', () => {
  it('adds adjacent advances and retains the newest session without mutating input', () => {
    const sessions = [session('a', 10, 12), session('a', 12, 20)]
    const groups = sessionGroups(sessions, readings)
    expect(groups).toHaveLength(1)
    expect(groups[0].delta).toBe(32)
    expect(groups[0].session).toBe(sessions[1])
    expect(sessions[0].end_pos).toBe(12)
  })

  it('does not merge sessions separated by another book', () => {
    const groups = sessionGroups([session('a', 12, 10), session('b', 11, 5), session('a', 10, 20)], readings)
    expect(groups.map((group) => group.delta)).toEqual([10, 5, 20])
  })

  it('keeps days and units separate and ignores missing readings', () => {
    const groups = sessionGroups(
      [session('a', 12, 10), session('audio', 11, 5), session('a', 10, 20, '2026-11-05'), session('missing', 9, 30)],
      readings,
    )
    expect(groups.map((group) => group.delta)).toEqual([10, 5, 20])
  })
})
