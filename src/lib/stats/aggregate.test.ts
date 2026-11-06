import { describe, expect, it } from 'vitest'
import { timeSpent } from './aggregate'

const range = { from: '2026-11-01', to: '2026-11-30' }

describe('timeSpent', () => {
  it.each([
    {
      label: 'audio with recorded minutes counts only recorded time',
      unit: 'minutes' as const,
      minutes: 25,
      expected: 25,
    },
    {
      label: 'audio without recorded minutes uses audio advance',
      unit: 'minutes' as const,
      minutes: null,
      expected: 60,
    },
    {
      label: 'paper without recorded minutes adds no time',
      unit: 'pages' as const,
      minutes: null,
      expected: 0,
    },
  ])('$label', ({ unit, minutes, expected }) => {
    const sessions = [{ reading_id: 'reading', read_on: '2026-11-06', start_pos: 10, end_pos: 70, minutes }]
    expect(timeSpent(sessions, [{ id: 'reading', unit }], range)).toBe(expected)
  })

  it('excludes sessions outside the selected period', () => {
    const sessions = [{ reading_id: 'reading', read_on: '2026-10-31', start_pos: 0, end_pos: 60, minutes: 30 }]
    expect(timeSpent(sessions, [{ id: 'reading', unit: 'minutes' }], range)).toBe(0)
  })
})
