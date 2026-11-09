import { describe, expect, it } from 'vitest'
import { collapsedSessionCount, convertPosition } from './convertUnits'

describe('reading unit conversion preview', () => {
  it('converts pages to percentage and percentage to a chosen page total', () => {
    expect(convertPosition(125, 500, 100)).toBe(25)
    expect(convertPosition(25, 100, 320)).toBe(80)
    expect(convertPosition(100, 100, 321)).toBe(321)
  })
  it('rounds half up consistently with SQL for positive positions', () => {
    expect(convertPosition(1, 200, 100)).toBe(1)
  })
  it('counts sessions that must be removed instead of violating end > start', () => {
    expect(collapsedSessionCount([{ start_pos: 1, end_pos: 2 }, { start_pos: 2, end_pos: 3 }, { start_pos: 5, end_pos: 10 }], 500, 100)).toBe(1)
    // A time-only session has nothing to lose and is kept, as edit_reading_units does since 0018.
    expect(collapsedSessionCount([{ start_pos: 5, end_pos: 5 }], 500, 100)).toBe(0)
  })
})
