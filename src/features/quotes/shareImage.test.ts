import { describe, expect, it } from 'vitest'
import { wrapQuoteText } from './shareImage'

const measure = (text: string) => Array.from(text).length

describe('wrapQuoteText', () => {
  it('keeps words together and includes the space in the measured width', () => {
    expect(wrapQuoteText('La vida es sueño', 7, measure)).toEqual(['La vida', 'es', 'sueño'])
  })

  it('uses the supplied font measurements rather than character counts', () => {
    const proportionalMeasure = (text: string) => Array.from(text).reduce((sum, letter) => sum + (letter === 'W' ? 4 : 1), 0)
    expect(wrapQuoteText('WW ii', 6, proportionalMeasure)).toEqual(['W', 'W', 'ii'])
  })

  it('preserves paragraph breaks, including empty paragraphs, and normalizes CRLF', () => {
    expect(wrapQuoteText('Primero\r\n\r\nSegundo\rTercero', 10, measure)).toEqual(['Primero', '', 'Segundo', 'Tercero'])
  })

  it('collapses horizontal whitespace and omits outer empty paragraphs', () => {
    expect(wrapQuoteText('\n  una\t  cita  \n', 20, measure)).toEqual(['una cita'])
  })

  it('splits a word wider than the available space without dropping text', () => {
    expect(wrapQuoteText('extraordinario', 5, measure)).toEqual(['extra', 'ordin', 'ario'])
  })

  it('keeps Unicode code points intact when splitting long words', () => {
    expect(wrapQuoteText('🌿🌿🌿', 2, measure)).toEqual(['🌿🌿', '🌿'])
  })

  it('makes progress when one glyph alone is wider than the available space', () => {
    expect(wrapQuoteText('WW', 1, (value) => value.length * 5)).toEqual(['W', 'W'])
  })

  it('returns no lines for empty or whitespace-only text', () => {
    expect(wrapQuoteText('', 10, measure)).toEqual([])
    expect(wrapQuoteText(' \n\t ', 10, measure)).toEqual([])
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects unusable width %s', (width) => {
    expect(() => wrapQuoteText('Cita', width, measure)).toThrow(RangeError)
  })
})
