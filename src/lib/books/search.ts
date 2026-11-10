import type { NewBook } from '../actions'

/** Book search: Google Books first (better for Spanish editions), Open Library when it fails or is empty. */

export interface Found extends NewBook {
  key: string
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const count = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null)
const https = (url: string) => url.replace(/^http:/, 'https:')

interface GoogleVolume {
  id?: string
  volumeInfo?: {
    title?: string
    authors?: string[]
    pageCount?: number
    publishedDate?: string
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>
    imageLinks?: { thumbnail?: string }
  }
}

export function fromGoogle(payload: { items?: GoogleVolume[] }): Found[] {
  return (payload.items ?? []).flatMap((item) => {
    const info = item.volumeInfo
    const title = text(info?.title)
    if (!info || !title) return []
    const year = Number.parseInt(info.publishedDate ?? '', 10)
    const cover = info.imageLinks?.thumbnail
    return [
      {
        key: `g:${item.id ?? title}`,
        title,
        author: (info.authors ?? []).join(', '),
        pages: count(info.pageCount),
        year: Number.isFinite(year) ? year : null,
        isbn: info.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier ?? null,
        cover_url: cover ? https(cover).replace(/&edge=curl\b/g, '') : null,
      },
    ]
  })
}

interface OpenLibraryDoc {
  key?: string
  title?: string
  author_name?: string[]
  number_of_pages_median?: number
  first_publish_year?: number
  cover_i?: number
  isbn?: string[]
}

export function fromOpenLibrary(payload: { docs?: OpenLibraryDoc[] }): Found[] {
  return (payload.docs ?? []).flatMap((doc) => {
    const title = text(doc.title)
    if (!title) return []
    return [
      {
        key: `o:${doc.key ?? title}`,
        title,
        author: (doc.author_name ?? []).join(', '),
        pages: count(doc.number_of_pages_median),
        year: count(doc.first_publish_year),
        isbn: doc.isbn?.find((isbn) => /^97[89]\d{10}$/.test(isbn)) ?? null,
        cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      },
    ]
  })
}

async function google(query: string, signal: AbortSignal): Promise<Found[]> {
  const params = new URLSearchParams({ q: query, printType: 'books', maxResults: '15' })
  const key = import.meta.env.VITE_GOOGLE_BOOKS_KEY?.trim()
  if (key) params.set('key', key)
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal })
  if (!response.ok) throw new Error('Google Books no responde')
  return fromGoogle(await response.json())
}

async function openLibrary(query: string, signal: AbortSignal): Promise<Found[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '15',
    fields: 'key,title,author_name,number_of_pages_median,first_publish_year,cover_i,isbn',
  })
  const response = await fetch(`https://openlibrary.org/search.json?${params}`, { signal })
  if (!response.ok) throw new Error('Open Library no responde')
  return fromOpenLibrary(await response.json())
}

export async function searchBooks(query: string, signal: AbortSignal): Promise<Found[]> {
  try {
    const books = await google(query, signal)
    if (books.length) return books
  } catch (error) {
    if (signal.aborted) throw error
  }
  return openLibrary(query, signal)
}
