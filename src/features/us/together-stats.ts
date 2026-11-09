import type { Profile, Quote, QuoteReply, Reaction, ReadTogether, ReadingWithBook, Session } from '@/lib/types'
import { formatMinutes } from '@/lib/units'

/** Minutes of each «lectura a la vez»: the shorter of both parts (the time you really overlapped). */
export function togetherMinutes(rows: ReadTogether[], sessions: Session[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const row of rows) {
    const parts = sessions.filter((s) => s.together_id === row.id && s.minutes)
    if (!parts.length) continue
    const mine = parts.filter((s) => s.user_id === row.user_a).reduce((sum, s) => sum + (s.minutes ?? 0), 0)
    const theirs = parts.filter((s) => s.user_id === row.user_b).reduce((sum, s) => sum + (s.minutes ?? 0), 0)
    out.set(row.id, mine && theirs ? Math.min(mine, theirs) : mine || theirs)
  }
  return out
}

/** The quote you loved most: hearts and replies, newest on a tie. */
export function lovedQuote(quotes: Quote[], reactions: Reaction[], replies: QuoteReply[]): Quote | undefined {
  const score = (q: Quote) =>
    reactions.filter((r) => r.target_id === q.id).length + replies.filter((r) => r.quote_id === q.id).length
  return quotes
    .filter((q) => q.shared && !q.locked && q.body)
    .sort((a, b) => score(b) - score(a) || b.created_at.localeCompare(a.created_at))
    .find((q) => score(q) > 0)
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export function monthName(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1]
}

/** The monthly letter: what the two of you lived reading that month, in a few warm sentences. */
export function monthLetter(input: {
  month: string
  me: Profile
  partner: Profile
  sessions: Session[]
  readings: ReadingWithBook[]
  rows: ReadTogether[]
  minutes: Map<string, number>
  quotes: Quote[]
  reactions: Reaction[]
  replies: QuoteReply[]
}): string[] {
  const { month, me, partner } = input
  const inMonth = (date: string) => date.startsWith(month)
  const days = (id: string) =>
    new Set(input.sessions.filter((s) => s.user_id === id && inMonth(s.read_on)).map((s) => s.read_on))
  const mine = days(me.id)
  const theirs = days(partner.id)
  const both = [...mine].filter((d) => theirs.has(d)).length
  const total = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
  const nights = input.rows.filter((r) => inMonth(r.started_at.slice(0, 10)) && input.minutes.has(r.id))
  const minutes = nights.reduce((sum, r) => sum + (input.minutes.get(r.id) ?? 0), 0)
  const longest = nights.sort((a, b) => (input.minutes.get(b.id) ?? 0) - (input.minutes.get(a.id) ?? 0))[0]
  const finished = (person: Profile) =>
    input.readings
      .filter((r) => r.user_id === person.id && r.status === 'finished' && r.finished_on && inMonth(r.finished_on))
      .map((r) => `«${r.book.title}»`)
  const list = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} y ${items.at(-1)}` : items[0])
  const loved = lovedQuote(
    input.quotes.filter((q) => inMonth(q.created_at.slice(0, 10))),
    input.reactions,
    input.replies,
  )
  const out = [
    `Querida ${partner.is_gift_recipient ? partner.display_name : me.display_name}, querido ${partner.is_gift_recipient ? me.display_name : partner.display_name}:`,
  ]
  out.push(
    both
      ? `En ${monthName(month)} leísteis los dos ${both} de sus ${total} días.`
      : `En ${monthName(month)} cada uno leyó a su ritmo; este mes es buen momento para coincidir.`,
  )
  if (nights.length)
    out.push(
      `Hubo ${nights.length} ${nights.length === 1 ? 'noche' : 'noches'} en las que leísteis a la vez, ${formatMinutes(minutes)} en total${
        longest && nights.length > 1 ? `; la más larga, ${formatMinutes(input.minutes.get(longest.id) ?? 0)}` : ''
      }.`,
    )
  for (const person of [partner, me]) {
    const books = finished(person)
    if (books.length) out.push(`${person.display_name} terminó ${list(books)}.`)
  }
  if (loved?.body) {
    const text = loved.body.length > 140 ? `${loved.body.slice(0, 139)}…` : loved.body
    out.push(`La cita que más os gustó: «${text}»${/[.!?…]$/.test(text) ? '' : '.'}`)
  }
  out.push('Que el mes que viene os pille con un libro entre las manos, y el otro al lado.')
  return out
}
