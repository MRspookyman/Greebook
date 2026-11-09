import { describe, expect, it } from 'vitest'
import { timeOnly, validSessionProgress } from './sessionRules'

describe('session progress rule', () => {
  it('accepts any forward progress, with or without minutes', () => {
    expect(validSessionProgress(300, 310, null)).toBe(true)
    expect(validSessionProgress(300, 301, 1)).toBe(true)
  })

  it('accepts staying on the same page only with at least 5 minutes', () => {
    expect(validSessionProgress(300, 300, 5)).toBe(true)
    expect(validSessionProgress(300, 300, 4)).toBe(false)
    expect(validSessionProgress(300, 300, null)).toBe(false)
  })

  it('never accepts going backwards', () => {
    expect(validSessionProgress(300, 299, 60)).toBe(false)
  })

  it('recognises time-only sessions', () => {
    expect(timeOnly({ start_pos: 12, end_pos: 12 })).toBe(true)
    expect(timeOnly({ start_pos: 12, end_pos: 20 })).toBe(false)
  })
})
