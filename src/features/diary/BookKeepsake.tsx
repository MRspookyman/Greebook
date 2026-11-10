import { useState } from 'react'
import { Lamp, MapPin, Quote as QuoteIcon, Share2 } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { Stars } from '@/components/Stars'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useCouple } from '@/features/us/useCouple'
import { fmt } from '@/lib/dates'
import type { ReadingWithBook } from '@/lib/types'
import { formatDays, formatFinished, formatMinutes } from '@/lib/units'
import { bookMemory } from './diary'
import { shareMemoryImage } from './memoryImage'

/**
 * What a finished book leaves behind: when each of you read it, the shape of the reading, the nights side by side
 * and the words kept. Your partner's mark stays blind until yours exists, as everywhere else.
 */
export function BookKeepsake({ reading }: { reading: ReadingWithBook }) {
  const { userId, profile, partner } = useMe()
  const c = useCouple()
  const [sharing, setSharing] = useState(false)
  const other = [...c.mineReadings, ...c.theirReadings]
    .filter((r) => r.book_id === reading.book_id && r.user_id !== reading.user_id && r.status === 'finished')
    .sort((a, b) => (b.finished_on ?? '').localeCompare(a.finished_on ?? ''))[0]
  const memory = bookMemory({
    reading,
    partnerReading: other,
    sessions: c.sessions,
    rows: c.rows,
    minutes: c.minutes,
    quotes: c.quotes,
  })
  const mineRead = memory.people.find((p) => p.userId === userId)
  const revealed = (id: string) => id === userId || (mineRead?.reading.rating ?? null) !== null
  const lineOf = (p: (typeof memory.people)[number]) =>
    [
      p.reading.finished_on
        ? p.days !== null && p.reading.started_on
          ? `del ${fmt(p.reading.started_on, 'd MMM')} al ${fmt(p.reading.finished_on, 'd MMM yyyy')}`
          : formatFinished(p.reading.finished_on, p.reading.finished_precision)
        : null,
      p.days !== null ? formatDays(p.days) : null,
      p.minutes > 0 ? formatMinutes(p.minutes) : null,
    ]
      .filter(Boolean)
      .join(' · ')
  const facts = [
    memory.nights > 0
      ? `${memory.nights} ${memory.nights === 1 ? 'noche' : 'noches'} leyendo a la vez (${formatMinutes(memory.nightMinutes)})`
      : null,
    memory.quotes > 0 ? `${memory.quotes} ${memory.quotes === 1 ? 'cita guardada' : 'citas guardadas'}` : null,
    memory.places.length > 0 ? `Leído en: ${memory.places.join(', ')}` : null,
  ].filter((fact): fact is string => !!fact)
  const max = Math.max(1, ...memory.curve.map((point) => point.amount))
  const favourite = c.quotes.find(
    (q) => q.book_id === reading.book_id && q.kind === 'cita' && q.shared && !q.locked && q.body && c.reactions.some((r) => r.target_id === q.id),
  ) ?? c.quotes.find((q) => q.book_id === reading.book_id && q.kind === 'cita' && q.shared && !q.locked && q.body)
  if (!lineOf(memory.people[0]) && memory.curve.length < 2 && facts.length === 0) return null
  const personOf = (id: string) => (id === userId ? profile : partner)

  return (
    <section className="card space-y-4" aria-labelledby="recuerdo">
      <h2 id="recuerdo" className="title">
        El recuerdo <span className="font-[family-name:var(--font-book)] italic">de este libro</span>
      </h2>
      <ul className="space-y-3">
        {memory.people.map((p) => {
          const person = personOf(p.userId)
          if (!person) return null
          return (
            <li key={p.userId} className="flex items-start gap-3">
              <Avatar person={person} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <b className="font-extrabold" style={{ color: `var(--${person.accent})` }}>
                    {p.userId === userId ? 'Tú' : person.display_name}
                  </b>
                  {p.reading.rating !== null && revealed(p.userId) && (
                    <Stars value={p.reading.rating} size={15} color={`var(--${person.accent})`} />
                  )}
                </div>
                <p className="text-[13.5px] text-muted">{lineOf(p) || 'Sin fechas apuntadas'}</p>
              </div>
            </li>
          )
        })}
      </ul>
      {memory.curve.length > 1 && (
        <figure className="space-y-1.5">
          <div className="flex h-16 items-end gap-[2px]" role="img" aria-label={`Lectura en ${memory.curve.length} días`}>
            {memory.curve.map((point) => (
              <span
                key={point.date}
                className="grow-y min-w-[3px] flex-1 rounded-t-[3px]"
                style={{ height: `${Math.max(8, (point.amount / max) * 100)}%`, background: `var(--${personOf(reading.user_id)?.accent ?? 'green'})` }}
              />
            ))}
          </div>
          <figcaption className="flex justify-between text-xs text-muted">
            <span>{fmt(memory.curve[0].date, 'd MMM')}</span>
            <span>{memory.curve.length} días de lectura</span>
            <span>{fmt(memory.curve.at(-1)!.date, 'd MMM')}</span>
          </figcaption>
        </figure>
      )}
      {facts.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {memory.nights > 0 && (
            <li className="flex items-center gap-2">
              <Lamp size={16} className="flex-none text-amber-ink" aria-hidden /> {facts.find((f) => f.includes('a la vez'))}
            </li>
          )}
          {memory.quotes > 0 && (
            <li className="flex items-center gap-2">
              <QuoteIcon size={15} className="flex-none text-rose" aria-hidden /> {facts.find((f) => f.includes('cita'))}
            </li>
          )}
          {memory.places.length > 0 && (
            <li className="flex items-center gap-2">
              <MapPin size={16} className="flex-none text-muted" aria-hidden /> {facts.find((f) => f.startsWith('Leído en'))}
            </li>
          )}
        </ul>
      )}
      <button
        type="button"
        className="btn btn-soft w-full"
        disabled={sharing}
        onClick={() => {
          setSharing(true)
          void shareMemoryImage({
            title: reading.book.title,
            authors: reading.book.authors.join(', '),
            people: memory.people.flatMap((p) => {
              const person = personOf(p.userId)
              return person ? [{ name: person.display_name, accent: person.accent, line: lineOf(p) || 'Leído' }] : []
            }),
            facts,
            curve: memory.curve.map((point) => point.amount),
            quote: favourite?.body && favourite.body.length <= 220 ? favourite.body : null,
          })
            .then((result) => {
              if (result === 'downloaded') toast('Imagen descargada')
            })
            .catch(() => toast('No se pudo crear la imagen'))
            .finally(() => setSharing(false))
        }}
      >
        <Share2 size={17} aria-hidden />
        {sharing ? 'Preparando…' : 'Compartir el recuerdo'}
      </button>
    </section>
  )
}
