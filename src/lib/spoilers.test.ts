import { describe, expect, it } from 'vitest'
import { isSpoiler } from './spoilers'

describe('isSpoiler', () => {
  const book = { page_count: 300 }
  const paper = { unit: 'pages' as const, total_units: 300, status: 'reading' as const }
  const audio = { unit: 'minutes' as const, total_units: 600, status: 'reading' as const }

  it('hides pages ahead of the current page', () => {
    expect(isSpoiler({ page: 150 }, { ...paper, current_position: 100 }, book)).toBe(true)
    expect(isSpoiler({ page: 100 }, { ...paper, current_position: 100 }, book)).toBe(false)
  })
  it('compares audio progress with the note position through the page count', () => {
    expect(isSpoiler({ page: 150 }, { ...audio, current_position: 300 }, book)).toBe(false)
    expect(isSpoiler({ page: 151 }, { ...audio, current_position: 300 }, book)).toBe(true)
  })
  it('hides positioned notes on audio without page count until finished', () => {
    expect(isSpoiler({ page: 10 }, { ...audio, current_position: 590 }, { page_count: null })).toBe(true)
    expect(isSpoiler({ page: 10 }, { ...audio, current_position: 600, status: 'finished' }, { page_count: null })).toBe(
      false,
    )
  })
  it('never hides a note without a page', () => {
    expect(isSpoiler({ page: null }, { ...audio, current_position: 0 }, book)).toBe(false)
  })
})
