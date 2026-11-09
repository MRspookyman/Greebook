import { describe, expect, it } from 'vitest'
import { pagesEquivalent, sessionScore } from './aggregate'
import { level } from './intensity'
import { bestStreak, coupleStreak, currentStreak, sharedStreak } from './streak'

describe('currentStreak', () => {
  const today = '2026-03-10'
  it('counts back from today when there is a session today', () => {
    expect(currentStreak(new Set(['2026-03-10', '2026-03-09', '2026-03-08']), today)).toBe(3)
  })
  it('counts from yesterday when today has no session yet', () => {
    expect(currentStreak(new Set(['2026-03-09', '2026-03-08']), today)).toBe(2)
  })
  it('stops at a gap', () => {
    expect(currentStreak(new Set(['2026-03-10', '2026-03-08']), today)).toBe(1)
  })
  it('is 0 without sessions', () => {
    expect(currentStreak(new Set(), today)).toBe(0)
  })
  it('crosses month boundaries', () => {
    expect(currentStreak(new Set(['2026-03-01', '2026-02-28']), '2026-03-01')).toBe(2)
  })
})

describe('bestStreak', () => {
  it('finds the longest run regardless of order', () => {
    const dates = new Set(['2026-01-05', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-06'])
    expect(bestStreak(dates)).toBe(3)
  })
})

describe('level', () => {
  it.each([
    [0, 0],
    [10, 1],
    [11, 2],
    [30, 2],
    [60, 3],
    [61, 4],
  ])('score %d → level %d', (score, lvl) => {
    expect(level(score)).toBe(lvl)
  })
})

describe('aggregate', () => {
  it('converts Kindle percentage advance to estimated pages', () => {
    const s = { start_pos: 10, end_pos: 20 }
    const reading = { unit: 'percent' as const, book: { page_count: 300 } }
    expect(pagesEquivalent(s, reading)).toBe(30)
    expect(sessionScore(s, reading)).toBe(30)
  })

  it('does not invent pages when a Kindle book has no page count', () => {
    const s = { start_pos: 10, end_pos: 20 }
    const reading = { unit: 'percent' as const, book: { page_count: null } }
    expect(pagesEquivalent(s, reading)).toBe(0)
    expect(sessionScore(s, reading)).toBe(0)
  })
})

describe('sharedStreak', () => {
  it('counts only days both read, and waits for today', () => {
    const me = new Set(['2026-03-08', '2026-03-09'])
    const you = new Set(['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10'])
    expect(sharedStreak(me, you, '2026-03-10')).toBe(2)
    me.add('2026-03-10')
    expect(sharedStreak(me, you, '2026-03-10')).toBe(3)
  })
  it('breaks on a day only one read', () => {
    expect(
      sharedStreak(
        new Set(['2026-03-08', '2026-03-10']),
        new Set(['2026-03-08', '2026-03-09', '2026-03-10']),
        '2026-03-10',
      ),
    ).toBe(1)
  })
})

describe('coupleStreak', () => {
  const days = (...list: string[]) => new Set(list)
  it('covers a day only one read with a wildcard, two per month', () => {
    const me = days('2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05')
    const you = days('2026-03-01', '2026-03-04', '2026-03-05')
    const s = coupleStreak(me, you, '2026-03-05')
    expect(s.current).toBe(5)
    expect([...s.wildcards]).toEqual(['2026-03-02', '2026-03-03'])
    expect(s.wildcardsThisMonth).toBe(2)
  })
  it('breaks when the wildcards run out or nobody reads', () => {
    const me = days('2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05')
    const you = days('2026-03-01', '2026-03-05')
    expect(coupleStreak(me, you, '2026-03-05').current).toBe(1)
    expect(coupleStreak(days('2026-03-01', '2026-03-03'), days('2026-03-01', '2026-03-03'), '2026-03-03').current).toBe(
      1,
    )
  })
  it('keeps today pending without breaking', () => {
    const s = coupleStreak(
      days('2026-03-01', '2026-03-02'),
      days('2026-03-01', '2026-03-02', '2026-03-03'),
      '2026-03-03',
    )
    expect(s.current).toBe(2)
    expect(s.todayPending).toBe(true)
    expect(s.best).toBe(2)
  })
  it('wildcards renew each month', () => {
    const me = days('2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02')
    const you = days('2026-03-30', '2026-04-02')
    expect(coupleStreak(me, you, '2026-04-02').current).toBe(4)
  })
})
