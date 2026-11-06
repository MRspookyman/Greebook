import { z } from 'zod'
import type { BookCandidate } from '@/lib/types'

const volume = z.object({
  id: z.string().optional(),
  volumeInfo: z.object({
    title: z.string().min(1),
    authors: z.array(z.string()).catch([]),
    pageCount: z.number().int().positive().nullish().catch(null),
    publishedDate: z.string().optional(),
    description: z.string().optional(),
    industryIdentifiers: z.array(z.object({ type: z.string(), identifier: z.string() })).catch([]),
    imageLinks: z.object({ thumbnail: z.string().optional() }).optional(),
  }),
})
const responseSchema = z.object({ items: z.array(z.unknown()).optional() })

async function queryGoogle(query: string): Promise<BookCandidate[]> {
  const params = new URLSearchParams({ q: query, printType: 'books', maxResults: '20' })
  const key = import.meta.env.VITE_GOOGLE_BOOKS_KEY?.trim()
  if (key) params.set('key', key)
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
  if (!response.ok) throw new Error('No se pudo consultar Google Books')
  const payload = responseSchema.parse(await response.json())
  return (payload.items ?? []).flatMap((item) => {
    const parsed = volume.safeParse(item)
    if (!parsed.success) return []
    const { id, volumeInfo: info } = parsed.data
    const year = Number.parseInt(info.publishedDate ?? '', 10)
    const cover = info.imageLinks?.thumbnail
    return [
      {
        google_id: id ?? null,
        openlibrary_key: null,
        isbn13: info.industryIdentifiers.find((value) => value.type === 'ISBN_13')?.identifier ?? null,
        title: info.title,
        authors: info.authors,
        page_count: info.pageCount ?? null,
        published_year: Number.isFinite(year) ? year : null,
        description: info.description ?? null,
        cover_url: cover ? cover.replace(/^http:/, 'https:').replace(/&edge=curl\b/g, '') : null,
      },
    ]
  })
}

export const searchGoogle = (query: string) => queryGoogle(query)
export const byIsbnGoogle = (isbn: string) => queryGoogle(`isbn:${isbn}`)
