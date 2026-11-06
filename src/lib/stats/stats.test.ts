import { describe, expect, it } from 'vitest'
import { audioMinutes, pagesEquivalent, sessionScore } from './aggregate'
import { level } from './intensity'
import { bestStreak, currentStreak } from './streak'

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
  it('converts percent progress to pages using page_count', () => {
    expect(pagesEquivalent({ start_pos: 10, end_pos: 20 }, { unit: 'percent' }, { page_count: 300 })).toBe(30)
  })
  it('percent without page_count counts 0 pages', () => {
    expect(pagesEquivalent({ start_pos: 10, end_pos: 20 }, { unit: 'percent' }, { page_count: null })).toBe(0)
  })
  it('audio counts minutes and half-weight score', () => {
    const s = { start_pos: 0, end_pos: 60 }
    expect(audioMinutes(s, { unit: 'minutes' })).toBe(60)
    expect(pagesEquivalent(s, { unit: 'minutes' }, { page_count: 300 })).toBe(0)
    expect(sessionScore(s, { unit: 'minutes' }, { page_count: 300 })).toBe(30)
  })
})
