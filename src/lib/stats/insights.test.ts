import { describe, expect, it } from 'vitest'
import type { Session } from '../types'
import {
  bestWeekday,
  estimatedFinish,
  goalProjection,
  pacePerDay,
  periodRange,
  pctChange,
  previousRange,
} from './insights'

const session = (read_on: string, start_pos: number, end_pos: number, reading_id = 'r'): Session => ({
  id: `${read_on}-${start_pos}`,
  reading_id,
  user_id: 'u',
  read_on,
  start_pos,
  end_pos,
  minutes: null,
  created_at: '',
})

describe('periods', () => {
  it('weeks run Monday to Sunday and step back a week', () => {
    // 2026-11-06 is a Friday
    expect(periodRange('week', '2026-11-06')).toEqual({ from: '2026-11-02', to: '2026-11-08' })
    expect(previousRange('week', '2026-11-06')).toEqual({ from: '2026-10-26', to: '2026-11-01' })
  })
  it('previous month crosses the year boundary', () => {
    expect(previousRange('month', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })
  it('pctChange is null without a previous value', () => {
    expect(pctChange(118, 100)).toBe(18)
    expect(pctChange(5, 0)).toBeNull()
  })
})

describe('pace and estimated finish', () => {
  const reading = { id: 'r', current_position: 214, total_units: 576 }
  it('averages progress over calendar days since the first session', () => {
    const sessions = [session('2026-11-01', 0, 100), session('2026-11-05', 100, 214)]
    // 214 pages over 6 days (1..6 Nov)
    expect(pacePerDay(reading, sessions, '2026-11-06')).toBeCloseTo(214 / 6)
    // 362 left / 35.67 per day → 11 days
    expect(estimatedFinish(reading, sessions, '2026-11-06')).toBe('2026-11-17')
  })
  it('has no estimate without sessions or when finished', () => {
    expect(estimatedFinish(reading, [], '2026-11-06')).toBeNull()
    expect(
      estimatedFinish({ ...reading, current_position: 576 }, [session('2026-11-01', 0, 576)], '2026-11-06'),
    ).toBeNull()
  })
})

describe('goalProjection', () => {
  it('projects the year total and the date the goal is reached', () => {
    // 10 books by 10 Apr (day 100 of 365): rate 0.1/day → 37 by year end, goal 20 reached on day 200
    const p = goalProjection(10, 20, '2026-04-10')
    expect(p.projected).toBe(37)
    expect(p.reachOn).toBe('2026-07-19')
  })
  it('returns no date when the pace does not reach the goal this year', () => {
    expect(goalProjection(1, 20, '2026-11-06').reachOn).toBeNull()
  })
  it('reports today once the goal is met', () => {
    expect(goalProjection(20, 20, '2026-11-06').reachOn).toBe('2026-11-06')
  })
})

describe('bestWeekday', () => {
  it('compares the best day average with the other days', () => {
    const readings = [{ id: 'r', unit: 'pages' as const, book: { page_count: 300 } }]
    const sessions = [
      session('2026-11-01', 0, 70), // Sunday 70
      session('2026-11-02', 70, 120), // Monday 50
      session('2026-11-03', 120, 170), // Tuesday 50
    ]
    expect(bestWeekday(sessions, readings)).toEqual({ name: 'domingo', morePct: 40 })
  })
  it('is null without sessions', () => {
    expect(bestWeekday([], [])).toBeNull()
  })
})
