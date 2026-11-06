import { z } from 'zod'
import type { BookCandidate } from '@/lib/types'

const fields = 'key,title,author_name,number_of_pages_median,first_publish_year,cover_i,isbn'
const documentSchema = z.object({
  key: z.string(),
  title: z.string().min(1),
  author_name: z.array(z.string()).catch([]),
  number_of_pages_median: z.number().int().positive().nullish().catch(null),
  first_publish_year: z.number().int().nullish().catch(null),
  cover_i: z.number().int().positive().nullish().catch(null),
  isbn: z.array(z.string()).catch([]),
})

async function queryOpenLibrary(params: URLSearchParams): Promise<BookCandidate[]> {
  params.set('limit', '20')
  params.set('fields', fields)
  const response = await fetch(`https://openlibrary.org/search.json?${params}`)
  if (!response.ok) throw new Error('No se pudo consultar Open Library')
  const payload = z.object({ docs: z.array(z.unknown()) }).parse(await response.json())
  return payload.docs.flatMap((document) => {
    const parsed = documentSchema.safeParse(document)
    if (!parsed.success) return []
    const book = parsed.data
    return [
      {
        google_id: null,
        openlibrary_key: book.key,
        isbn13: book.isbn.find((isbn) => /^97[89]\d{10}$/.test(isbn)) ?? null,
        title: book.title,
        authors: book.author_name,
        page_count: book.number_of_pages_median ?? null,
        published_year: book.first_publish_year ?? null,
        cover_url: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
        description: null,
      },
    ]
  })
}

export const searchOpenLibrary = (query: string) => queryOpenLibrary(new URLSearchParams({ q: query }))
export const byIsbnOpenLibrary = (isbn: string) => queryOpenLibrary(new URLSearchParams({ isbn }))
