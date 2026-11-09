import type { Format, ReadingStatus, ReadingWithBook } from '@/lib/types'

export interface LibraryCard {
  key: string
  reading: ReadingWithBook
  /** All active people's readings of this book, including their other states. */
  readings: ReadingWithBook[]
  /** Readings that place the book on this shelf (and in this year, for finished books). */
  matches: ReadingWithBook[]
  year: string | null
}

function latest(readings: ReadingWithBook[]): ReadingWithBook | undefined {
  return readings.reduce<ReadingWithBook | undefined>((best, reading) =>
    !best || reading.updated_at > best.updated_at ? reading : best, undefined)
}

/** Latest finish wins, regardless of when an older reread was edited. */
export function cardFinish(card: LibraryCard, userId: string): ReadingWithBook | undefined {
  return card.matches.filter((reading) => reading.user_id === userId).reduce<ReadingWithBook | undefined>(
    (best, reading) => !best || (reading.finished_on ?? '') > (best.finished_on ?? '') ||
      (reading.finished_on === best.finished_on && reading.updated_at > best.updated_at) ? reading : best,
    undefined,
  )
}

/** Prefer this shelf's reading, falling back to the person's latest reread. */
export function cardReading(card: LibraryCard, userId: string): ReadingWithBook | undefined {
  return (card.year ? cardFinish(card, userId) : latest(card.matches.filter((reading) => reading.user_id === userId))) ??
    latest(card.readings.filter((reading) => reading.user_id === userId))
}

/** Links always prefer my own reading, even when only my partner's books are displayed. */
export function cardTarget(card: LibraryCard, all: ReadingWithBook[], userId: string): ReadingWithBook {
  const mine = all.filter((reading) => reading.book_id === card.reading.book_id && reading.user_id === userId)
  return latest(mine.filter((reading) => reading.status === card.reading.status)) ?? latest(mine) ??
    latest(card.readings) ?? card.reading
}

/** One book per shelf, except that finished rereads get one card per finish year. */
export function libraryCards(
  readings: ReadingWithBook[],
  status: ReadingStatus,
  search = '',
  format: Format | 'all' = 'all',
): LibraryCard[] {
  const query = search.trim().toLocaleLowerCase('es')
  const books = new Map<string, ReadingWithBook[]>()
  for (const reading of readings) {
    if (query && ![reading.book.title, ...reading.book.authors].some((text) => text.toLocaleLowerCase('es').includes(query))) continue
    const group = books.get(reading.book_id)
    if (group) group.push(reading)
    else books.set(reading.book_id, [reading])
  }
  const cards: LibraryCard[] = []
  for (const [bookId, group] of books) {
    const shelves = new Map<string, ReadingWithBook[]>()
    for (const reading of group) {
      if (reading.status !== status || (format !== 'all' && reading.format !== format)) continue
      const year = status === 'finished' ? reading.finished_on?.slice(0, 4) ?? 'unknown' : ''
      const matches = shelves.get(year)
      if (matches) matches.push(reading)
      else shelves.set(year, [reading])
    }
    for (const [year, matches] of shelves) {
      const reading = status === 'finished'
        ? matches.reduce((best, item) => (item.finished_on ?? '') > (best.finished_on ?? '') ? item : best)
        : latest(matches)!
      cards.push({ key: `${bookId}:${year}`, reading, readings: group, matches, year: year || null })
    }
  }
  return cards.sort((a, b) => {
    const activity = (card: LibraryCard) => status === 'finished'
      ? card.reading.finished_on ?? ''
      : status === 'want'
        ? card.matches.reduce((date, reading) => reading.created_at > date ? reading.created_at : date, '')
        : card.readings.reduce((date, reading) => reading.updated_at > date ? reading.updated_at : date, '')
    return activity(b).localeCompare(activity(a)) || a.key.localeCompare(b.key)
  })
}

export type FinishedSort = 'average' | 'mine' | 'partner' | 'recent' | 'title'

export function cardRatings(card: LibraryCard): number[] {
  return [...new Set(card.matches.map((reading) => reading.user_id))]
    .flatMap((id) => {
      const rating = cardFinish(card, id)?.rating
      return rating == null ? [] : [rating]
    })
}

function average(ratings: number[]): number | null {
  return ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null
}

export interface FinishedGroup {
  year: string
  cards: LibraryCard[]
  average: number | null
}

/** Cards already contain only the active people and selected formats. */
export function finishedGroups(cards: LibraryCard[], sort: FinishedSort, userId: string, partnerId?: string): FinishedGroup[] {
  const years = new Map<string, LibraryCard[]>()
  for (const card of cards) {
    const year = card.year ?? 'unknown'
    const group = years.get(year)
    if (group) group.push(card)
    else years.set(year, [card])
  }
  const scores = new Map(cards.map((card) => [card, average(cardRatings(card))]))
  const descending = (a: number | null, b: number | null) => a === null ? (b === null ? 0 : 1) : b === null ? -1 : b - a
  const recent = (a: LibraryCard, b: LibraryCard) => (b.reading.finished_on ?? '').localeCompare(a.reading.finished_on ?? '')
  const title = (a: LibraryCard, b: LibraryCard) => a.reading.book.title.localeCompare(b.reading.book.title, 'es')
  const personal = (card: LibraryCard) => cardFinish(card, sort === 'mine' ? userId : partnerId ?? '')?.rating ?? null
  return [...years].sort(([a], [b]) => a === 'unknown' ? 1 : b === 'unknown' ? -1 : b.localeCompare(a))
    .map(([year, group]) => ({
      year,
      average: average(group.flatMap(cardRatings)),
      cards: group.sort((a, b) => {
        const primary = sort === 'title' ? title(a, b) : sort === 'recent' ? recent(a, b)
          : sort === 'average' ? descending(scores.get(a)!, scores.get(b)!)
            : descending(personal(a), personal(b))
        // Unrated personal-sort entries keep a simple most-recent-first order.
        if (primary) return primary
        if ((sort === 'mine' || sort === 'partner') && personal(a) === null && personal(b) === null) {
          return recent(a, b) || title(a, b)
        }
        return descending(scores.get(a)!, scores.get(b)!) || recent(a, b) || title(a, b)
      }),
    }))
}
