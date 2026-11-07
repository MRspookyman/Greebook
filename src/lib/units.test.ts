import { describe, expect, it } from 'vitest'
import { coverBadge } from './units'

const base = { unit: 'pages' as const, current_position: 0, total_units: 200, rating: null }

describe('coverBadge', () => {
  it('shows progress while reading', () => {
    expect(coverBadge({ ...base, status: 'reading', current_position: 70 })).toBe('35 %')
  })

  it('shows the rating once finished, or a check without one', () => {
    expect(coverBadge({ ...base, status: 'finished', rating: 4.5 })).toBe('★ 4,5')
    expect(coverBadge({ ...base, status: 'finished' })).toBe('✓')
  })

  it('shows where an abandoned book was left', () => {
    expect(coverBadge({ ...base, status: 'abandoned', current_position: 120 })).toBe('p. 120')
    expect(coverBadge({ ...base, status: 'abandoned', unit: 'minutes', current_position: 95 })).toBe('1 h 35 min')
  })

  it('leaves waiting books unmarked', () => {
    expect(coverBadge({ ...base, status: 'want' })).toBeUndefined()
  })
})
