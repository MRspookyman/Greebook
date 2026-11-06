import { describe, expect, it } from 'vitest'
import { isSpoiler } from './spoilers'

describe('isSpoiler', () => {
  const book = { page_count: 300 }
  it('hides pages ahead of the current position', () => {
    expect(isSpoiler({ page: 150 }, { unit: 'pages', current_position: 100, status: 'reading' }, book)).toBe(true)
    expect(isSpoiler({ page: 100 }, { unit: 'pages', current_position: 100, status: 'reading' }, book)).toBe(false)
  })
  it('compares percentages with the page count', () => {
    expect(isSpoiler({ page: 150 }, { unit: 'percent', current_position: 50, status: 'reading' }, book)).toBe(false)
    expect(isSpoiler({ page: 151 }, { unit: 'percent', current_position: 50, status: 'reading' }, book)).toBe(true)
  })
  it('hides positioned notes for unfinished audio or unknown page counts', () => {
    expect(isSpoiler({ page: 150 }, { unit: 'minutes', current_position: 200, status: 'reading' }, book)).toBe(true)
    expect(isSpoiler({ page: 150 }, { unit: 'minutes', current_position: 200, status: 'finished' }, book)).toBe(false)
    expect(
      isSpoiler({ page: 150 }, { unit: 'percent', current_position: 90, status: 'reading' }, { page_count: null }),
    ).toBe(true)
  })
  it('never hides a note without a page', () => {
    expect(isSpoiler({ page: null }, { unit: 'minutes', current_position: 0, status: 'reading' }, book)).toBe(false)
  })
})
