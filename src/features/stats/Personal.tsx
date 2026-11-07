import { Link } from 'react-router'
import type { ReadingWithBook, Session } from '@/lib/types'
import { fmt } from '@/lib/dates'
import { formatDays, formatMinutes } from '@/lib/units'
import { DAY_PARTS, records, timeOfDay } from '@/lib/stats/personal'

const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

/** «Cuándo lees»: ranked share of sessions by part of the day (one series, one hue, values at the bar end). */
export function TimeOfDay({ sessions }: { sessions: Session[] }) {
  const parts = timeOfDay(sessions)
  if (!parts) return null
  const max = Math.max(...Object.values(parts))
  const top = DAY_PARTS.reduce((best, part) => (parts[part.value] > parts[best.value] ? part : best))
  return (
    <section className="space-y-3" aria-labelledby="when-title">
      <div>
        <h2 id="when-title" className="title">
          Cuándo lees
        </h2>
        <p className="mt-1 text-[14px] text-muted">
          Sobre todo por la {top.label.toLowerCase()}: {Math.round(parts[top.value] * 100)} % de tus sesiones.
        </p>
      </div>
      <dl className="grid grid-cols-[96px_minmax(0,1fr)_44px] items-center gap-x-3 gap-y-2.5">
        {DAY_PARTS.map((part, index) => (
          <div key={part.value} className="contents">
            <dt className="text-[14px]">
              {part.label} <span className="block text-xs text-muted">{part.hours}</span>
            </dt>
            <dd aria-hidden className="m-0">
              <span
                className="block h-3 origin-left rounded-r-[4px] bg-accent"
                style={{
                  width: `${max ? (parts[part.value] / max) * 100 : 0}%`,
                  animation: `gb-grow-x 760ms var(--ease) ${120 + index * 60}ms both`,
                }}
              />
            </dd>
            <dd className="m-0 text-right text-[14px] font-semibold">{Math.round(parts[part.value] * 100)} %</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** The year's finished books, one spine per book in its month, inked by rating (validated `--rate-*` ramp). */
export function RatingShelf({ readings, year }: { readings: ReadingWithBook[]; year: string }) {
  const finished = readings
    .filter((r) => r.status === 'finished' && r.finished_on?.startsWith(year))
    .sort((a, b) => (a.finished_on ?? '').localeCompare(b.finished_on ?? ''))
  if (!finished.length) return null
  const byMonth = MONTHS.map((_, month) => finished.filter((r) => Number(r.finished_on!.slice(5, 7)) - 1 === month))
  const ink = (rating: number | null) => (rating === null ? 'var(--rule)' : `var(--rate-${Math.max(1, Math.round(rating))})`)
  return (
    <section className="space-y-3" aria-labelledby="shelf-title">
      <div>
        <h2 id="shelf-title" className="title">
          Tu balda de {year}
        </h2>
        <p className="mt-1 text-[14px] text-muted">Cada libro terminado en su mes; más oscuro, mejor nota.</p>
      </div>
      <div>
        <div className="grid h-[104px] grid-cols-12 items-end gap-0.5 px-0.5">
          {byMonth.map((books, month) => (
            <div key={month} className="flex h-full items-end justify-center gap-px">
              {books.map((r, index) => (
                <Link
                  key={r.id}
                  to={`/libro/${r.id}`}
                  aria-label={`${r.book.title}, ${fmt(r.finished_on!, 'MMMM')}${r.rating !== null ? `, ${r.rating.toLocaleString('es')} estrellas` : ''}`}
                  className="block min-w-0 rounded-t-[2px]"
                  style={{
                    width: books.length > 1 ? 9 : 16,
                    height: `${62 + ((r.book.page_count ?? r.total_units) % 5) * 8 + index * 2}%`,
                    background: ink(r.rating),
                    boxShadow: 'inset 0 6px 0 -4px rgb(244 230 200 / 0.55)',
                    animation: `gb-grow-y 620ms var(--ease) ${month * 30}ms both`,
                    transformOrigin: 'bottom',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div aria-hidden className="h-[6px] rounded-[1px] bg-[#6e4b2f]" />
        <div aria-hidden className="mt-1.5 grid grid-cols-12 gap-0.5 text-center text-xs text-muted">
          {MONTHS.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-[2px]" style={{ background: `var(--rate-${n})` }} />
            {n}★
          </span>
        ))}
      </p>
    </section>
  )
}

/** Personal bests, as a short list. */
export function Records({ sessions, readings }: { sessions: Session[]; readings: ReadingWithBook[] }) {
  const r = records(sessions, readings)
  const rows = [
    r.longestSession && ['Sesión más larga', `${formatMinutes(r.longestSession.minutes)} · ${fmt(r.longestSession.date, 'd MMM')}`],
    r.bestDay && ['Más páginas en un día', `${r.bestDay.pages} · ${fmt(r.bestDay.date, 'd MMM')}`],
    r.fastestBook && ['Libro más rápido', `${r.fastestBook.title} · ${formatDays(r.fastestBook.days)}`],
  ].filter(Boolean) as [string, string][]
  if (!rows.length) return null
  return (
    <section className="space-y-2" aria-labelledby="records-title">
      <h2 id="records-title" className="title">
        Tus récords
      </h2>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-12 items-center justify-between gap-4 border-b border-rule">
            <dt className="text-[14px] text-muted">{label}</dt>
            <dd className="m-0 text-right text-[15px] font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
