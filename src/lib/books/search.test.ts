import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchGoogle } from './googleBooks'
import { searchOpenLibrary } from './openLibrary'
import { searchBooks } from './search'
import { isIsbn, normalizeIsbn } from './searchMode'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

afterEach(() => vi.unstubAllGlobals())

function mockFetch() {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items: [], docs: [] }),
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

describe('book search modes', () => {
  it.each([
    ['all', 'Patria'],
    ['title', 'intitle:Patria'],
    ['author', 'inauthor:Patria'],
    ['isbn', 'isbn:Patria'],
  ] as const)('maps Google mode %s to its search operator', async (mode, expected) => {
    const fetcher = mockFetch()
    await searchGoogle('Patria', mode)
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('q')).toBe(expected)
  })

  it.each([
    ['all', 'q'],
    ['title', 'title'],
    ['author', 'author'],
    ['isbn', 'isbn'],
  ] as const)('maps Open Library mode %s to its parameter', async (mode, parameter) => {
    const fetcher = mockFetch()
    await searchOpenLibrary('Patria', mode)
    const params = new URL(fetcher.mock.calls[0][0]).searchParams
    expect(params.get(parameter)).toBe('Patria')
    expect(params.get('limit')).toBe('20')
  })

  it('keeps the selected mode when falling back to Open Library', async () => {
    const fetcher = mockFetch()
    await searchBooks('Almudena Grandes', 'author')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('author')).toBe('Almudena Grandes')
  })

  it.each(['978-84-376-0494-7', '0-8044-2957-X'])('automatically looks up ISBN %s in Todo', async (isbn) => {
    const fetcher = mockFetch()
    await searchBooks(isbn)
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('q')).toBe(`isbn:${normalizeIsbn(isbn)}`)
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('isbn')).toBe(normalizeIsbn(isbn))
  })

  it('normalizes ISBN-10 including a lowercase check digit', () => {
    expect(normalizeIsbn(' 0 8044-2957-x ')).toBe('080442957X')
    expect(isIsbn('0 8044-2957-x')).toBe(true)
    expect(isIsbn('9788437604947')).toBe(true)
    expect(isIsbn('978843')).toBe(false)
    expect(isIsbn('Patria')).toBe(false)
  })
})
