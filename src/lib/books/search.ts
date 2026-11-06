import type { Book, BookCandidate } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { byIsbnGoogle, searchGoogle } from './googleBooks'
import { byIsbnOpenLibrary, searchOpenLibrary } from './openLibrary'

async function withFallback(primary: () => Promise<BookCandidate[]>, fallback: () => Promise<BookCandidate[]>) {
  try {
    const books = await primary()
    if (books.length) return books
  } catch {
    // A provider failure (including quota limits) falls back to Open Library.
  }
  return fallback()
}

export const searchBooks = (query: string) =>
  withFallback(
    () => searchGoogle(query),
    () => searchOpenLibrary(query),
  )
export const lookupIsbn = (isbn: string) =>
  withFallback(
    () => byIsbnGoogle(isbn),
    () => byIsbnOpenLibrary(isbn),
  )

async function findBook(candidate: BookCandidate): Promise<Book | null> {
  for (const field of ['google_id', 'isbn13', 'openlibrary_key'] as const) {
    if (!candidate[field]) continue
    const { data, error } = await supabase.from('books').select('*').eq(field, candidate[field]).maybeSingle()
    if (error) throw error
    if (data) return data as Book
  }
  return null
}

export async function upsertBook(candidate: BookCandidate): Promise<Book> {
  const existing = await findBook(candidate)
  if (existing) return existing
  const { data, error } = await supabase.from('books').insert(candidate).select('*').single()
  if (!error) return data as Book
  if (error.code === '23505') {
    const raced = await findBook(candidate)
    if (raced) return raced
  }
  throw error
}
