import { describe, expect, it } from 'vitest'
import { formatFinished, formatLabel, formatMinutes, formatPosition, formatUnitDelta, formatUnitValue, physicalPagePosition, unitLabel } from './units'

describe('reading units', () => {
  it('labels paper and Kindle formats and their units', () => {
    expect(formatLabel('paper')).toBe('Papel')
    expect(formatLabel('ebook')).toBe('Kindle')
    expect(unitLabel('pages')).toBe('Páginas')
    expect(unitLabel('percent')).toBe('%')
  })

  it('formats positions and progress in pages or percentages', () => {
    expect(formatPosition({ unit: 'pages', current_position: 72, total_units: 340 })).toBe('p. 72 / 340')
    expect(formatPosition({ unit: 'percent', current_position: 45, total_units: 100 })).toBe('45 %')
    expect(formatUnitValue('percent', 45)).toBe('45 %')
    expect(formatUnitDelta('percent', 10)).toBe('10 %')
  })

  it('preserves recorded reading-time formatting', () => {
    expect(formatMinutes(190)).toBe('3 h 10 min')
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(25)).toBe('25 min')
    expect(formatMinutes(0)).toBe('0 min')
  })
})

describe('physical quote pages', () => {
  it('keeps page positions unchanged', () => {
    expect(physicalPagePosition({ unit: 'pages', current_position: 72, total_units: 340, book: { page_count: null } })).toBe(72)
  })

  it('estimates Kindle pages without opening a quote before its page is reached', () => {
    expect(physicalPagePosition({ unit: 'percent', current_position: 25, total_units: 100, book: { page_count: 301 } })).toBe(75)
    expect(physicalPagePosition({ unit: 'percent', current_position: 100, total_units: 100, book: { page_count: 301 } })).toBe(301)
  })

  it('does not invent a page when the Kindle page count is unknown', () => {
    expect(physicalPagePosition({ unit: 'percent', current_position: 45, total_units: 100, book: { page_count: null } })).toBeNull()
    expect(physicalPagePosition({ unit: 'percent', current_position: 45, total_units: 0, book: { page_count: 300 } })).toBeNull()
  })
})

describe('finished dates', () => {
  it('shows only the known precision in Spanish', () => {
    expect(formatFinished('2019-03-01', 'year')).toBe('2019')
    expect(formatFinished('2019-03-01', 'month')).toBe('marzo 2019')
    expect(formatFinished('2019-03-12', 'day')).toBe('12 de marzo de 2019')
    expect(formatFinished('2019-03-12', null)).toBe('12 de marzo de 2019')
  })
})
