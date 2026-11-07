import { useState } from 'react'
import { Link } from 'react-router'
import { useMe } from '@/features/auth/me'
import { useAllNotes } from '@/lib/data'
import { fmt, todayISO } from '@/lib/dates'
import type { Note, ReadingWithBook, Session } from '@/lib/types'
import { formatMinutes } from '@/lib/units'

type Filter = 'all' | 'sessions' | 'notes' | 'milestones'
type Entry =
  | { kind: 'session'; key: string; date: string; at: string; session: Session; reading: ReadingWithBook }
  | { kind: 'note'; key: string; date: string; at: string; note: Note; reading: ReadingWithBook }
  | { kind: 'milestone'; key: string; date: string; at: string; reading: ReadingWithBook; event: 'started' | 'finished' | 'abandoned' }

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'sessions', label: 'Sesiones' },
  { value: 'notes', label: 'Notas y citas' },
  { value: 'milestones', label: 'Hitos' },
]
const PAGE = 25

/** Your reading record, day by day: sessions, notes and quotes, books started and finished. */
export function Journal({ sessions, readings }: { sessions: Session[]; readings: ReadingWithBook[] }) {
  const { userId } = useMe()
  const notes = useAllNotes(userId)
  const [filter, setFilter] = useState<Filter>('all')
  const [shown, setShown] = useState(PAGE)
  const byId = new Map(readings.map((r) => [r.id, r]))
  const entries: Entry[] = []
  if (filter === 'all' || filter === 'sessions')
    for (const session of sessions) {
      const reading = byId.get(session.reading_id)
      if (reading) entries.push({ kind: 'session', key: `s${session.id}`, date: session.read_on, at: session.created_at, session, reading })
    }
  if (filter === 'all' || filter === 'notes')
    for (const note of notes.data ?? []) {
      const reading = byId.get(note.reading_id)
      if (reading) entries.push({ kind: 'note', key: `n${note.id}`, date: note.created_at.slice(0, 10), at: note.created_at, note, reading })
    }
  if (filter === 'all' || filter === 'milestones')
    for (const reading of readings) {
      if (reading.started_on)
        entries.push({ kind: 'milestone', key: `b${reading.id}`, date: reading.started_on, at: `${reading.started_on}T00:00`, reading, event: 'started' })
      if (reading.status === 'finished' && reading.finished_on)
        entries.push({ kind: 'milestone', key: `f${reading.id}`, date: reading.finished_on, at: `${reading.finished_on}T23:59`, reading, event: 'finished' })
    }
  entries.sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at))
  const visible = entries.slice(0, shown)
  const days: { date: string; items: Entry[] }[] = []
  for (const entry of visible) {
    const last = days[days.length - 1]
    if (last?.date === entry.date) last.items.push(entry)
    else days.push({ date: entry.date, items: [entry] })
  }
  const today = todayISO()

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Qué mostrar" className="no-scrollbar -mx-[22px] flex gap-2 overflow-x-auto px-[22px]">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" className="chip flex-none" aria-pressed={filter === f.value} onClick={() => { setFilter(f.value); setShown(PAGE) }}>
            {f.label}
          </button>
        ))}
      </div>
      {!days.length && <p className="text-[15px] text-muted">Aquí irá apareciendo todo lo que registres.</p>}
      {days.map((day) => {
        const minutes = day.items.reduce((sum, e) => sum + (e.kind === 'session' ? (e.session.minutes ?? 0) : 0), 0)
        return (
          <section key={day.date} aria-labelledby={`d-${day.date}`}>
            <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
              <h2 id={`d-${day.date}`} className="font-sans text-[15px] font-semibold tracking-normal">
                {day.date === today ? 'Hoy' : fmt(day.date, "EEEE d 'de' MMMM")}
              </h2>
              {minutes > 0 && <span className="text-[13px] text-muted">{formatMinutes(minutes)}</span>}
            </div>
            <ul>
              {day.items.map((entry) => (
                <li key={entry.key} className="border-b border-rule/60 py-3">
                  <JournalEntry entry={entry} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {entries.length > shown && (
        <button type="button" className="btn btn-outline w-full" onClick={() => setShown(shown + PAGE)}>
          Ver más
        </button>
      )}
    </div>
  )
}

function JournalEntry({ entry }: { entry: Entry }) {
  const { reading } = entry
  const title = (
    <Link to={`/libro/${reading.id}`} className="-my-2.5 block py-2.5 font-serif text-[17px] leading-snug">
      {reading.book.title}
    </Link>
  )
  if (entry.kind === 'session') {
    const s = entry.session
    const delta = s.end_pos - s.start_pos
    const pace = reading.unit === 'pages' && s.minutes && s.minutes >= 5 ? Math.round((delta / s.minutes) * 60) : null
    return (
      <div className="flex gap-3">
        <span aria-hidden className="mt-2 h-2.5 w-2.5 flex-none rounded-full bg-[var(--heat-4)]" />
        <div className="min-w-0">
          {title}
          <p className="mt-0.5 text-[14px] text-muted">
            {reading.unit === 'pages' ? `p. ${s.start_pos} → ${s.end_pos} · +${delta} págs` : `+${formatMinutes(delta)}`}
            {s.minutes ? ` · ${s.minutes} min` : ''}
            {pace ? ` · ${pace} pág/h` : ''}
          </p>
        </div>
      </div>
    )
  }
  if (entry.kind === 'note') {
    const n = entry.note
    return (
      <div className="flex gap-3">
        <span aria-hidden className="mt-2 h-2.5 w-2.5 flex-none rotate-45 bg-amber" />
        <figure className="m-0 min-w-0">
          {n.kind === 'quote' ? (
            <blockquote className="m-0 border-l-2 border-amber pl-3 font-serif text-[17px] leading-relaxed">«{n.body}»</blockquote>
          ) : (
            <p className="font-serif text-[17px] leading-relaxed italic">{n.body}</p>
          )}
          <figcaption className="mt-1 text-[13px] text-muted">
            {n.kind === 'quote' ? 'Cita' : 'Nota'} · {reading.book.title}
            {n.page !== null ? ` · p. ${n.page}` : ''}
          </figcaption>
        </figure>
      </div>
    )
  }
  return (
    <div className="flex gap-3">
      <span aria-hidden className="mt-2 h-2.5 w-2.5 flex-none bg-ink" />
      <div className="min-w-0">
        <p className="text-[13px] text-muted">{entry.event === 'finished' ? 'Terminaste' : 'Empezaste'}</p>
        {title}
        {entry.event === 'finished' && reading.rating !== null && (
          <p className="mt-0.5 text-[14px] text-muted">★ {reading.rating.toLocaleString('es')}</p>
        )}
      </div>
    </div>
  )
}
