import type { Quote, ReadTogether, ReadingWithBook, Session } from '@/lib/types'

export type DiaryKind = 'started' | 'finished' | 'abandoned' | 'quote' | 'night'

export interface DiaryEvent {
  key: string
  /** Local 'yyyy-MM-dd'. */
  date: string
  kind: DiaryKind
  /** Who did it; both of you when it was the same book on the same day, or a night read side by side. */
  who: string[]
  title: string
  /** Reading to open (mine when there is one). */
  readingId?: string
  bookId?: string
  /** Minutes for a night, the sentence for a quote, the mark for a finished book. */
  minutes?: number
  body?: string
  rating?: number | null
  note?: string | null
  places?: string[]
}

export interface DiaryMonth {
  /** 'yyyy-MM' */
  month: string
  events: DiaryEvent[]
}

const localDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * The diary of the two of you: books begun, finished and left, quotes kept for each other and nights read at the
 * same time, newest first and grouped by month. Finishes known only by year or month are left out of days they
 * never had (they go to the first day of what is known).
 */
export function buildDiary(input: {
  userId: string
  readings: ReadingWithBook[]
  quotes: Quote[]
  rows: ReadTogether[]
  minutes: Map<string, number>
  sessions?: Session[]
}): DiaryMonth[] {
  const events = new Map<string, DiaryEvent>()
  const add = (event: DiaryEvent, user: string) => {
    const existing = events.get(event.key)
    if (!existing) {
      events.set(event.key, event)
      return
    }
    if (!existing.who.includes(user)) existing.who.push(user)
    // Opening the entry leads to your own reading when you have one.
    if (user === input.userId && event.readingId) existing.readingId = event.readingId
  }
  for (const reading of input.readings) {
    const base = { title: reading.book.title, readingId: reading.id, bookId: reading.book_id, who: [reading.user_id] }
    // Backfilled history has no real start day.
    if (reading.started_on && !reading.backfilled)
      add({ ...base, key: `started:${reading.book_id}:${reading.started_on}`, date: reading.started_on, kind: 'started' }, reading.user_id)
    if (reading.status === 'finished' && reading.finished_on)
      add(
        { ...base, key: `finished:${reading.book_id}:${reading.finished_on}`, date: reading.finished_on, kind: 'finished', rating: reading.rating },
        reading.user_id,
      )
    if (reading.status === 'abandoned')
      add(
        { ...base, key: `abandoned:${reading.id}`, date: reading.updated_at.slice(0, 10), kind: 'abandoned', note: reading.abandon_reason ?? null },
        reading.user_id,
      )
  }
  for (const quote of input.quotes) {
    // Only what can be read: a locked quote would be a spoiler, a private one is nobody else's.
    if (quote.locked || !quote.body || (!quote.shared && quote.user_id !== input.userId)) continue
    events.set(`quote:${quote.id}`, {
      key: `quote:${quote.id}`,
      date: localDate(quote.created_at),
      kind: 'quote',
      who: [quote.user_id],
      title: quote.book.title,
      bookId: quote.book_id,
      body: quote.body,
    })
  }
  for (const row of input.rows) {
    const minutes = input.minutes.get(row.id)
    if (!minutes) continue
    const places = [
      ...new Set((input.sessions ?? []).filter((s) => s.together_id === row.id && s.place).map((s) => s.place as string)),
    ]
    events.set(`night:${row.id}`, {
      key: `night:${row.id}`,
      date: localDate(row.started_at),
      kind: 'night',
      who: [row.user_a, row.user_b],
      title: '',
      minutes,
      note: row.note,
      places,
    })
  }
  const order: Record<DiaryKind, number> = { finished: 0, night: 1, quote: 2, started: 3, abandoned: 4 }
  const sorted = [...events.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || order[a.kind] - order[b.kind] || a.key.localeCompare(b.key),
  )
  const months: DiaryMonth[] = []
  for (const event of sorted) {
    const month = event.date.slice(0, 7)
    const last = months.at(-1)
    if (last?.month === month) last.events.push(event)
    else months.push({ month, events: [event] })
  }
  return months
}

export interface YearAgo {
  reading: ReadingWithBook
  /** Whole years back (1, 2…). */
  years: number
  finishedThen: boolean
}

/**
 * «Hace un año leíais…»: a book one of you was in the middle of (or finishing) on this date in an earlier year.
 * The most recent year wins; mine before my partner's.
 */
export function yearAgo(readings: ReadingWithBook[], today: string, userId: string): YearAgo | null {
  const year = Number(today.slice(0, 4))
  for (let years = 1; years <= 5; years++) {
    const date = `${year - years}${today.slice(4)}`
    const from = shift(date, -10)
    const to = shift(date, 10)
    const match = readings
      .filter((r) => {
        if (!r.started_on || r.backfilled) return false
        if (r.status === 'finished' && r.finished_on && r.finished_precision === 'day')
          return r.started_on <= to && r.finished_on >= from
        // Left or still open: only if it was begun around then.
        return r.started_on >= from && r.started_on <= to
      })
      .sort((a, b) => Number(b.user_id === userId) - Number(a.user_id === userId) || b.started_on!.localeCompare(a.started_on!))[0]
    if (match)
      return {
        reading: match,
        years,
        finishedThen: match.status === 'finished' && !!match.finished_on && match.finished_on >= from && match.finished_on <= to,
      }
  }
  return null
}

function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Everything one book left behind for the two of you, for its keepsake card. */
export interface BookMemory {
  people: { userId: string; reading: ReadingWithBook; days: number | null; minutes: number; sessions: number }[]
  /** Pages (or percent) per reading day of the given reading, oldest first. */
  curve: { date: string; amount: number }[]
  nights: number
  nightMinutes: number
  quotes: number
  places: string[]
}

export function bookMemory(input: {
  reading: ReadingWithBook
  partnerReading?: ReadingWithBook
  sessions: Session[]
  rows: ReadTogether[]
  minutes: Map<string, number>
  quotes: Quote[]
}): BookMemory {
  const readings = [input.reading, ...(input.partnerReading ? [input.partnerReading] : [])]
  const ids = new Set(readings.map((r) => r.id))
  const own = input.sessions.filter((s) => ids.has(s.reading_id))
  const people = readings.map((reading) => {
    const mine = own.filter((s) => s.reading_id === reading.id)
    const days =
      reading.started_on && reading.finished_on && reading.finished_precision === 'day' && !reading.backfilled
        ? Math.round((Date.parse(`${reading.finished_on}T00:00:00Z`) - Date.parse(`${reading.started_on}T00:00:00Z`)) / 86400000) + 1
        : null
    return {
      userId: reading.user_id,
      reading,
      days,
      minutes: mine.reduce((sum, s) => sum + (s.minutes ?? 0), 0),
      sessions: mine.length,
    }
  })
  const byDay = new Map<string, number>()
  for (const s of own.filter((s) => s.reading_id === input.reading.id))
    byDay.set(s.read_on, (byDay.get(s.read_on) ?? 0) + (s.end_pos - s.start_pos))
  const nightIds = new Set(own.flatMap((s) => (s.together_id ? [s.together_id] : [])))
  const nights = input.rows.filter((row) => nightIds.has(row.id) && input.minutes.has(row.id))
  return {
    people,
    curve: [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })),
    nights: nights.length,
    nightMinutes: nights.reduce((sum, row) => sum + (input.minutes.get(row.id) ?? 0), 0),
    quotes: input.quotes.filter((q) => q.book_id === input.reading.book_id && !q.locked).length,
    places: [...new Set(own.flatMap((s) => (s.place ? [s.place] : [])))],
  }
}
