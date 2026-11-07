import { describe, expect, it } from 'vitest'
import {
  elapsedMs,
  formatClock,
  parseTimer,
  pauseTimerState,
  resumeTimerState,
  spokenClock,
  timerMinutes,
  type TimerState,
} from './timer'

const base: TimerState = { readingId: 'r1', startedAt: 1_000_000, pausedAt: null, pausedMs: 0 }

describe('timer', () => {
  it('counts elapsed time while running', () => {
    expect(elapsedMs(base, 1_000_000 + 90_000)).toBe(90_000)
    expect(timerMinutes(base, 1_000_000 + 90_000)).toBe(2)
  })

  it('never reports less than one minute', () => {
    expect(timerMinutes(base, 1_000_000 + 5_000)).toBe(1)
  })

  it('freezes during a pause and excludes it after resuming', () => {
    const paused = pauseTimerState(base, 1_000_000 + 60_000)
    expect(elapsedMs(paused, 1_000_000 + 10 * 60_000)).toBe(60_000)
    const resumed = resumeTimerState(paused, 1_000_000 + 10 * 60_000)
    expect(resumed.pausedAt).toBeNull()
    expect(elapsedMs(resumed, 1_000_000 + 11 * 60_000)).toBe(2 * 60_000)
  })

  it('ignores repeated pause and resume calls', () => {
    const paused = pauseTimerState(base, 2_000_000)
    expect(pauseTimerState(paused, 3_000_000)).toBe(paused)
    expect(resumeTimerState(base, 3_000_000)).toBe(base)
  })

  it('accepts timers stored before pauses existed', () => {
    expect(parseTimer({ readingId: 'r1', startedAt: 5 })).toEqual({
      readingId: 'r1',
      startedAt: 5,
      pausedAt: null,
      pausedMs: 0,
      draft: null,
    })
  })

  it('keeps the page set before leaving the reading screen', () => {
    expect(parseTimer({ readingId: 'r1', startedAt: 5, draft: 231 })?.draft).toBe(231)
    expect(parseTimer({ readingId: 'r1', startedAt: 5, draft: 'x' })?.draft).toBeNull()
  })

  it('rejects malformed timers', () => {
    expect(parseTimer(null)).toBeNull()
    expect(parseTimer({ readingId: 1, startedAt: 5 })).toBeNull()
    expect(parseTimer({ readingId: 'r1', startedAt: 'x' })).toBeNull()
    expect(parseTimer({ readingId: 'r1', startedAt: 5, pausedMs: -1 })).toBeNull()
  })

  it('formats the clock', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(247)).toBe('04:07')
    expect(formatClock(3723)).toBe('1:02:03')
    expect(spokenClock(1457)).toBe('24 min 17 s')
  })
})
