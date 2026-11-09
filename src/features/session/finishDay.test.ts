import { describe, expect, it } from 'vitest'
import { finishDay } from './finishDay'

describe('finishDay', () => {
  it('uses the day of the last session of that reading', () => {
    const sessions = [
      { reading_id: 'a', read_on: '2026-11-02' },
      { reading_id: 'a', read_on: '2026-11-07' },
      { reading_id: 'b', read_on: '2026-11-09' },
    ]
    expect(finishDay(sessions, 'a', '2026-11-09')).toBe('2026-11-07')
  })

  it('falls back to today without sessions and ignores future dates', () => {
    expect(finishDay([], 'a', '2026-11-09')).toBe('2026-11-09')
    expect(finishDay([{ reading_id: 'a', read_on: '2026-11-10' }], 'a', '2026-11-09')).toBe('2026-11-09')
  })
})
