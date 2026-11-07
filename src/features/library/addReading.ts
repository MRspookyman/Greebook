import { upsertBook } from '@/lib/books/search'
import { todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { BookCandidate, Format, Unit } from '@/lib/types'

/** The book is already on the user's «Pendientes» or «Leyendo» shelf. */
export class AlreadyInLibrary extends Error {
  readonly readingId: string
  constructor(readingId: string) {
    super('Ya lo tienes en tu biblioteca')
    this.name = 'AlreadyInLibrary'
    this.readingId = readingId
  }
}

/** Stores the book (if new) and adds it to the user's library; returns the new reading's id. */
export async function addReading(input: {
  userId: string
  candidate: BookCandidate
  format: Format
  total: number
  status: 'want' | 'reading'
}): Promise<string> {
  const book = await upsertBook(input.candidate)
  const { data: active, error: activeError } = await supabase
    .from('readings')
    .select('id')
    .eq('user_id', input.userId)
    .eq('book_id', book.id)
    .in('status', ['want', 'reading'])
    .limit(1)
  if (activeError) throw activeError
  if (active?.[0]) throw new AlreadyInLibrary(active[0].id)
  const unit: Unit = input.format === 'paper' ? 'pages' : 'minutes'
  const { data, error } = await supabase
    .from('readings')
    .insert({
      user_id: input.userId,
      book_id: book.id,
      format: input.format,
      unit,
      total_units: input.total,
      status: input.status,
      started_on: input.status === 'reading' ? todayISO() : null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/** Undo for a just-added reading (no sessions yet). */
export async function removeReading(id: string): Promise<void> {
  const { error } = await supabase.from('readings').delete().eq('id', id)
  if (error) throw error
}
