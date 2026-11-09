import { pagesEquivalent } from '@/lib/stats/aggregate'
import { coupleStreak } from '@/lib/stats/streak'
import type { Profile, Quote, QuoteReply, Reaction, ReadTogether, ReadingWithBook, Session } from '@/lib/types'
import { monthName, talkedQuote } from './together-stats'

export interface YearSummary {
  year: string
  /** The year is still going: the summary is «de momento». */
  partial: boolean
  /** Distinct books either of you finished this year. */
  books: number
  people: { person: Profile; books: number; pages: number }[]
  pages: number
  bothDays: number
  minutesTogether: number
  topMonth: { name: string; pages: number } | null
  bestStreak: number
  favorite: { title: string; note: string } | null
  quote: { body: string; title: string } | null
}

/**
 * The year of the two of you in books. In January it still shows the year that just ended, so the summary can be
 * enjoyed (and shared) after New Year's Eve.
 */
export function summaryYear(today: string): string {
  const year = Number(today.slice(0, 4))
  return String(today.slice(5, 7) === '01' ? year - 1 : year)
}

export function yearSummary(input: {
  year: string
  today: string
  me: Profile
  partner: Profile
  readings: ReadingWithBook[]
  sessions: Session[]
  rows: ReadTogether[]
  minutes: Map<string, number>
  quotes: Quote[]
  reactions: Reaction[]
  replies: QuoteReply[]
}): YearSummary {
  const { year, me, partner } = input
  const inYear = (date: string | null | undefined) => !!date && date.startsWith(year)
  const finished = input.readings.filter((r) => r.status === 'finished' && inYear(r.finished_on))
  const byId = new Map(input.readings.map((r) => [r.id, r]))
  const yearSessions = input.sessions.filter((s) => inYear(s.read_on))
  const pagesOf = (sessions: Session[]) =>
    sessions.reduce((sum, s) => {
      const reading = byId.get(s.reading_id)
      return sum + (reading ? pagesEquivalent(s, reading) : 0)
    }, 0)
  const people = [partner, me].map((person) => ({
    person,
    books: finished.filter((r) => r.user_id === person.id).length,
    pages: pagesOf(yearSessions.filter((s) => s.user_id === person.id)),
  }))
  const datesOf = (id: string) => new Set(yearSessions.filter((s) => s.user_id === id).map((s) => s.read_on))
  const mine = datesOf(me.id)
  const theirs = datesOf(partner.id)
  const end = input.today < `${year}-12-31` ? input.today : `${year}-12-31`

  const byMonth = new Map<string, number>()
  for (const session of yearSessions) {
    const reading = byId.get(session.reading_id)
    if (!reading) continue
    const month = session.read_on.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + pagesEquivalent(session, reading))
  }
  const [topMonth, topPages] = [...byMonth].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? []

  // The book you liked most: best average among those you both rated, else the best single mark (4 or more).
  const both = finished
    .filter((r) => r.user_id === me.id && r.rating !== null)
    .flatMap((mineRead) => {
      const other = finished.find((r) => r.user_id === partner.id && r.book_id === mineRead.book_id && r.rating !== null)
      return other ? [{ title: mineRead.book.title, average: (mineRead.rating! + other.rating!) / 2 }] : []
    })
    .sort((a, b) => b.average - a.average)[0]
  const single = finished
    .filter((r) => r.rating !== null && r.rating >= 4)
    .sort((a, b) => b.rating! - a.rating! || (b.finished_on ?? '').localeCompare(a.finished_on ?? ''))[0]
  const mark = (value: number) => value.toLocaleString('es', { maximumFractionDigits: 1 })
  const favorite = both
    ? { title: both.title, note: `${mark(both.average)} de media entre los dos` }
    : single
      ? { title: single.book.title, note: `${mark(single.rating!)} de ${single.user_id === me.id ? 'ti' : partner.display_name}` }
      : null

  const yearQuotes = input.quotes.filter((q) => inYear(q.created_at.slice(0, 10)))
  const talked =
    talkedQuote(yearQuotes, input.reactions, input.replies) ??
    yearQuotes.find((q) => q.shared && !q.locked && q.body && input.reactions.some((r) => r.target_id === q.id))

  return {
    year,
    partial: input.today < `${year}-12-31`,
    books: new Set(finished.map((r) => r.book_id)).size,
    people,
    pages: people.reduce((sum, p) => sum + p.pages, 0),
    bothDays: [...mine].filter((date) => theirs.has(date)).length,
    minutesTogether: input.rows
      .filter((r) => inYear(r.started_at.slice(0, 10)))
      .reduce((sum, r) => sum + (input.minutes.get(r.id) ?? 0), 0),
    topMonth: topMonth && topPages ? { name: monthName(topMonth), pages: topPages } : null,
    bestStreak: coupleStreak(mine, theirs, end).best,
    favorite,
    quote: talked?.body ? { body: talked.body, title: talked.book.title } : null,
  }
}
