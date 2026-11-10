import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, BookCheck, BookOpen, BookX, Lamp, Quote as QuoteIcon } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { FilterChips } from '@/components/FilterChips'
import { Stars } from '@/components/Stars'
import { useMe } from '@/features/auth/me'
import { useCouple } from '@/features/us/useCouple'
import { monthName } from '@/features/us/together-stats'
import { fmt } from '@/lib/dates'
import type { Profile } from '@/lib/types'
import { formatMinutes } from '@/lib/units'
import { buildDiary, type DiaryEvent, type DiaryKind } from './diary'

type Filter = 'all' | 'books' | 'quote' | 'night'
const ICONS: Record<DiaryKind, typeof BookOpen> = {
  started: BookOpen,
  finished: BookCheck,
  abandoned: BookX,
  quote: QuoteIcon,
  night: Lamp,
}

/** El diario de los dos: everything you have read, kept and shared, month by month. */
export function DiaryPage() {
  const { userId, profile, partner } = useMe()
  const c = useCouple()
  const [filter, setFilter] = useState<Filter>('all')
  const [shown, setShown] = useState(4)
  const people = new Map<string, Profile>([[profile.id, profile], ...(partner ? [[partner.id, partner] as const] : [])])
  const months = buildDiary({
    userId,
    readings: [...c.mineReadings, ...c.theirReadings],
    quotes: c.quotes,
    rows: c.rows,
    minutes: c.minutes,
    sessions: c.sessions,
  })
    .map((month) => ({
      ...month,
      events: month.events.filter(
        (event) =>
          filter === 'all' ||
          (filter === 'books' ? ['started', 'finished', 'abandoned'].includes(event.kind) : event.kind === filter),
      ),
    }))
    .filter((month) => month.events.length > 0)
  const nameOf = (id: string) => (id === userId ? 'Tú' : (people.get(id)?.display_name ?? ''))
  const subject = (event: DiaryEvent) =>
    event.who.length > 1 ? 'Los dos' : nameOf(event.who[0])
  const verb = (event: DiaryEvent, plural: string, mine: string, theirs: string) =>
    event.who.length > 1 ? plural : event.who[0] === userId ? mine : theirs

  return (
    <div className="space-y-6">
      <Link to="/nosotros" className="btn btn-link -my-2 -ml-1 px-1 no-underline">
        <ArrowLeft size={19} aria-hidden /> Nosotros
      </Link>
      <header className="enter space-y-1">
        <h1 className="display">
          Vuestro <span className="display-italic">diario</span>
        </h1>
        <p className="text-[15px] text-muted">Lo que habéis leído, guardado y compartido, mes a mes.</p>
      </header>
      <FilterChips<Filter>
        bleed
        options={[
          { value: 'all', label: 'Todo' },
          { value: 'books', label: 'Libros' },
          { value: 'quote', label: 'Citas' },
          { value: 'night', label: 'Noches a la vez' },
        ]}
        value={filter}
        onChange={(value) => {
          setFilter(value)
          setShown(4)
        }}
        aria-label="Qué mostrar"
      />
      {c.loading ? (
        <div className="h-56 animate-pulse rounded-[22px] bg-sunk" role="status" aria-label="Cargando el diario" />
      ) : months.length === 0 ? (
        <EmptyState title="Aún no hay nada que contar">
          <p className="text-muted">Cuando empecéis un libro, guardéis una cita o leáis a la vez, aparecerá aquí.</p>
        </EmptyState>
      ) : (
        <>
          {months.slice(0, shown).map((month, monthIndex) => (
            <section key={month.month} className="enter space-y-1" style={{ '--i': Math.min(monthIndex, 4) } as CSSProperties} aria-labelledby={`m-${month.month}`}>
              <h2 id={`m-${month.month}`} className="flex items-baseline gap-2">
                <span className="capitalize">{monthName(month.month)}</span>
                <span className="font-sans text-sm font-bold text-muted">{month.month.slice(0, 4)}</span>
              </h2>
              <ol className="relative ml-[17px] border-l-[1.5px] border-rule">
                {month.events.map((event) => {
                  const Icon = ICONS[event.kind]
                  const color =
                    event.kind === 'night' ? 'var(--amber-ink)' : event.who.length > 1 ? 'var(--rose)' : `var(--${people.get(event.who[0])?.accent ?? 'green'})`
                  const body = (
                    <>
                      <span
                        aria-hidden
                        className="absolute -left-[18px] grid h-[34px] w-[34px] place-items-center rounded-full bg-bg"
                        style={{ color, boxShadow: `inset 0 0 0 1.5px ${color}` }}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="text-[15px] leading-snug">
                          {event.kind === 'night' ? (
                            <>
                              <b className="font-extrabold">Leísteis a la vez</b> {formatMinutes(event.minutes ?? 0)}
                            </>
                          ) : event.kind === 'quote' ? (
                            <>
                              <b className="font-extrabold" style={{ color }}>{subject(event)}</b>{' '}
                              {verb(event, 'guardasteis', 'guardaste', 'guardó')} algo de «{event.title}»
                            </>
                          ) : (
                            <>
                              <b className="font-extrabold" style={{ color }}>{subject(event)}</b>{' '}
                              {event.kind === 'started'
                                ? verb(event, 'empezasteis', 'empezaste', 'empezó')
                                : event.kind === 'finished'
                                  ? verb(event, 'terminasteis', 'terminaste', 'terminó')
                                  : verb(event, 'dejasteis', 'dejaste', 'dejó')}{' '}
                              «{event.title}»
                            </>
                          )}
                        </span>
                        {event.kind === 'quote' && event.body && (
                          <span className="quote-text line-clamp-3 text-[15.5px]">«{event.body}»</span>
                        )}
                        {event.kind === 'finished' && event.who.length === 1 && event.rating != null && (
                          <Stars value={event.rating} size={15} color={color} />
                        )}
                        {event.note && <span className="hand text-[20px]" style={event.kind === 'night' ? { color: 'var(--rose)' } : undefined}>{event.note}</span>}
                        {event.places && event.places.length > 0 && <span className="text-[13px] text-muted">{event.places.join(' · ')}</span>}
                        <span className="text-[13px] text-muted">{fmt(event.date, "EEEE d")}</span>
                      </span>
                    </>
                  )
                  const className = 'relative flex min-h-14 items-start gap-3 py-2.5 pl-7'
                  return (
                    <li key={event.key}>
                      {event.readingId ? (
                        <Link to={`/libro/${event.readingId}`} className={`pressable ${className}`}>{body}</Link>
                      ) : event.kind === 'quote' ? (
                        <Link to={`/citas#c-${event.key.slice(6)}`} className={`pressable ${className}`}>{body}</Link>
                      ) : (
                        <div className={className}>{body}</div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
          {months.length > shown && (
            <button type="button" className="btn btn-soft w-full" onClick={() => setShown(shown + 6)}>
              Ver meses anteriores
            </button>
          )}
        </>
      )}
    </div>
  )
}
