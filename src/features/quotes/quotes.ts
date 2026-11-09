import { useMe } from '@/features/auth/me'
import { qk, useQuoteReplies, useQuotes, useReadings } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { Quote, QuoteKind, Reaction, ReadingWithBook } from '@/lib/types'
import { formatPosition, physicalPagePosition } from '@/lib/units'

export async function saveQuote(input: {
  bookId: string
  id?: string
  page: number | null
  kind: QuoteKind
  body: string
  comment?: string | null
  shared: boolean
  safe?: boolean
  photoPath?: string | null
}): Promise<string> {
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      ...(input.id ? { id: input.id } : {}),
      book_id: input.bookId,
      page: input.page,
      kind: input.kind,
      body: input.body.trim() || null,
      comment: input.kind === 'cita' ? input.comment?.trim() || null : null,
      shared: input.shared,
      safe: input.safe ?? false,
      photo_path: input.photoPath ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.quotes() })
  return (data as { id: string }).id
}

export async function updateQuote(
  id: string,
  patch: Partial<{ page: number | null; kind: QuoteKind; body: string | null; comment: string | null; shared: boolean; safe: boolean; photo_path: string | null }>,
): Promise<void> {
  const { error } = await supabase.from('quotes').update(patch).eq('id', id)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.quotes() })
}

export async function deleteQuote(id: string, photoPath?: string | null): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) throw error
  if (photoPath) await supabase.storage.from('quote-photos').remove([photoPath])
  await queryClient.invalidateQueries({ queryKey: qk.quotes() })
}

export async function replyToQuote(quoteId: string, body: string): Promise<void> {
  const { error } = await supabase.from('quote_replies').insert({ quote_id: quoteId, body: body.trim() })
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.quoteReplies() })
}

export async function updateQuoteReply(id: string, body: string): Promise<void> {
  const { error } = await supabase.from('quote_replies').update({ body: body.trim() }).eq('id', id)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.quoteReplies() })
}

export async function deleteQuoteReply(id: string): Promise<void> {
  const { error } = await supabase.from('quote_replies').delete().eq('id', id)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.quoteReplies() })
}

export async function openQuoteEarly(id: string): Promise<void> {
  const { error } = await supabase.rpc('open_quote_early', { quote_id: id })
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.quotes() })
}

export async function markQuotesSeen(ids: string[]): Promise<void> {
  if (!ids.length) return
  const { error } = await supabase.rpc('mark_quotes_seen', { ids })
  if (error) throw error
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.quotes() }),
    queryClient.invalidateQueries({ queryKey: qk.quoteReplies() }),
  ])
}

/** ❤️ on/off on a partner's quote, optimistic: it shows at once, without asking the server who you are first. */
export async function toggleQuoteHeart(quoteId: string, userId: string): Promise<void> {
  await queryClient.cancelQueries({ queryKey: qk.reactions() })
  const before = queryClient.getQueryData<Reaction[]>(qk.reactions()) ?? []
  const existing = before.find((r) => r.user_id === userId && r.target_id === quoteId)
  const reaction: Reaction = {
    id: crypto.randomUUID(),
    user_id: userId,
    target_type: 'quote',
    target_id: quoteId,
    emoji: '❤️',
    created_at: new Date().toISOString(),
  }
  queryClient.setQueryData(
    qk.reactions(),
    existing ? before.filter((r) => r.id !== existing.id) : [...before, reaction],
  )
  try {
    const { error } = existing
      ? await supabase.from('reactions').delete().eq('id', existing.id)
      : await supabase.from('reactions').insert(reaction)
    if (error) throw error
  } catch (error) {
    queryClient.setQueryData(qk.reactions(), before)
    throw error
  } finally {
    void queryClient.invalidateQueries({ queryKey: qk.reactions() })
  }
}

/** My latest reading of a book (open ones first), to know where I am in it. */
export function myReadingOf(readings: ReadingWithBook[] | undefined, bookId: string): ReadingWithBook | undefined {
  return (readings ?? [])
    .filter((r) => r.book_id === bookId)
    .sort(
      (a, b) =>
        Number(b.status === 'reading') - Number(a.status === 'reading') || b.updated_at.localeCompare(a.updated_at),
    )[0]
}

/** Physical pages left until a locked quote opens, when its position can be estimated. */
export function pagesUntil(quote: Pick<Quote, 'page'>, reading: ReadingWithBook | undefined): number | null {
  if (!reading || quote.page === null) return null
  const position = physicalPagePosition(reading)
  return position === null ? null : Math.max(0, quote.page - position)
}

/** Partner quotes I can read but haven't seen, plus partner replies I haven't seen: the Citas badge. */
export function useUnseenQuotes(): { quoteIds: string[]; count: number } {
  const { partner } = useMe()
  const quotes = useQuotes(!!partner).data ?? []
  const replies = useQuoteReplies(!!partner).data ?? []
  const fresh = quotes.filter((q) => q.user_id === partner?.id && !q.locked && !q.seen_at)
  const withReplies = replies.filter((r) => r.user_id === partner?.id && !r.seen_at)
  const ids = new Set([...fresh.map((q) => q.id), ...withReplies.map((r) => r.quote_id)])
  return { quoteIds: [...ids], count: fresh.length + withReplies.length }
}

/** Quotes retain physical page references even when the partner tracks Kindle percentages. */
export function shareNote(
  partnerName: string,
  partnerReading: ReadingWithBook | undefined,
  page: number | null,
  shared: boolean,
  safe = false,
): { locked: boolean; text: string } {
  if (!shared) return { locked: true, text: 'Solo la verás tú.' }
  if (safe) return { locked: false, text: `${partnerName} la verá aunque vaya por detrás.` }
  const position = partnerReading ? physicalPagePosition(partnerReading) : null
  if (
    partnerReading &&
    ['want', 'reading'].includes(partnerReading.status) &&
    page !== null &&
    (position === null || position < page)
  )
  {
    if (partnerReading.unit === 'percent' && !partnerReading.book.page_count)
      return { locked: true, text: `Este libro no tiene páginas: ${partnerName} la verá al terminarlo, o márcala sin spoilers.` }
    return {
      locked: true,
      text: `${partnerName} va por ${formatPosition(partnerReading)}: la verá al llegar a la p. ${page}, sin spoilers.`,
    }
  }
  return { locked: false, text: `${partnerName} la verá en Citas y le llegará un aviso suave.` }
}

export function usePartnerReadings() {
  const { partner } = useMe()
  return useReadings(partner?.id)
}
