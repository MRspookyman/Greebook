import { describe, expect, it } from 'vitest'
import { normalizeQuoteSearch } from './search'

describe('normalizeQuoteSearch', () => {
  it('ignores Spanish accents, dieresis, ñ and case', () => {
    expect(normalizeQuoteSearch('ÁÉÍÓÚ Ü Ñ')).toBe('aeiou u n')
    expect(normalizeQuoteSearch('García Márquez')).toBe('garcia marquez')
  })

  it('treats composed and decomposed accents identically', () => {
    expect(normalizeQuoteSearch('página')).toBe(normalizeQuoteSearch('pa\u0301gina'))
  })

  it('trims and collapses whitespace for multiline quotes', () => {
    expect(normalizeQuoteSearch('  Una\n\tCITA   del libro  ')).toBe('una cita del libro')
  })

  it('allows accent-free queries to match accented titles and quote bodies', () => {
    const visibleText = normalizeQuoteSearch('El amor en los tiempos del cólera — Gabriel García Márquez')
    expect(visibleText.includes(normalizeQuoteSearch('GARCIA MARQUEZ'))).toBe(true)
    expect(visibleText.includes(normalizeQuoteSearch('colera'))).toBe(true)
  })

  it('keeps punctuation, numbers and non-Latin text', () => {
    expect(normalizeQuoteSearch('¿Página 42? 世界')).toBe('¿pagina 42? 世界')
  })

  it('handles empty and whitespace-only queries', () => {
    expect(normalizeQuoteSearch('')).toBe('')
    expect(normalizeQuoteSearch(' \t\n ')).toBe('')
  })
})
