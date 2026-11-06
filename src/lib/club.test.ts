import { describe, expect, it } from 'vitest'
import { clubStops, coupleStreak, couplePair, isLive, nextStop, nextSunday, positionInPages, suggestedGoal } from './club'

describe('club de dos', () => {
  it('places stops every 100 pages in long books and every 50 in short ones', () => {
    expect(clubStops({ unit: 'pages', total_units: 576 })).toEqual([100, 200, 300, 400, 500])
    expect(clubStops({ unit: 'pages', total_units: 180 })).toEqual([50, 100, 150])
    expect(clubStops({ unit: 'pages', total_units: 300 })).toEqual([100, 200])
    expect(clubStops({ unit: 'minutes', total_units: 900 })).toEqual([])
  })

  it('finds the next stop', () => {
    expect(nextStop({ unit: 'pages', total_units: 576, current_position: 214 })).toBe(300)
    expect(nextStop({ unit: 'pages', total_units: 576, current_position: 200 })).toBe(300)
    expect(nextStop({ unit: 'pages', total_units: 576, current_position: 550 })).toBeNull()
  })

  it('converts audio progress to pages', () => {
    const audio = { unit: 'minutes' as const, total_units: 600, current_position: 300, status: 'reading' as const }
    expect(positionInPages(audio, 400)).toBe(200)
    expect(positionInPages(audio, null)).toBeNull()
  })

  it('counts days on which both read', () => {
    const mine = new Set(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'])
    const theirs = new Set(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'])
    expect(coupleStreak(mine, theirs, '2026-11-06')).toBe(3)
    expect(coupleStreak(new Set([...mine, '2026-11-06']), theirs, '2026-11-06')).toBe(4)
    expect(coupleStreak(mine, new Set(['2026-11-01']), '2026-11-06')).toBe(0)
  })

  it('treats old timers as not live', () => {
    const now = Date.parse('2026-11-06T21:00:00Z')
    expect(isLive({ reading_now_id: 'r', reading_now_since: '2026-11-06T20:30:00Z' }, now)).toBe(true)
    expect(isLive({ reading_now_id: 'r', reading_now_since: '2026-11-06T10:00:00Z' }, now)).toBe(false)
    expect(isLive({ reading_now_id: null, reading_now_since: '2026-11-06T20:30:00Z' }, now)).toBe(false)
  })

  it('orders the couple pair and suggests goals', () => {
    expect(couplePair('b', 'a')).toEqual({ user_a: 'a', user_b: 'b' })
    expect(suggestedGoal([0, 0, 0])).toBe(1000)
    expect(suggestedGoal([1200, 1400, 0])).toBe(1450)
  })

  it('finds next sunday', () => {
    expect(nextSunday('2026-11-06')).toBe('2026-11-08')
    expect(nextSunday('2026-11-08')).toBe('2026-11-08')
  })
})
