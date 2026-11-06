import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useMe } from '@/features/auth/me'
import { Avatar } from '@/components/Avatar'
import { DualProgressBar } from '@/components/DualProgressBar'
import { EmptyState } from '@/components/EmptyState'
import { Segmented } from '@/components/Segmented'
import { Stars } from '@/components/Stars'
import { useEntered } from '@/components/motion'
import { useReadings, useSessions } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { summarize } from '@/lib/stats/aggregate'
import { periodRange, type Period } from '@/lib/stats/insights'
import { supabase } from '@/lib/supabase'
import type { Note, Profile, ReadingWithBook, Session } from '@/lib/types'
import { formatUnitDelta, progressFraction } from '@/lib/units'
import { jointDistance } from './jointDistance'
import { ReactionBar } from './ReactionBar'

const periods = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
] satisfies { value: Period; label: string }[]

function Comparison({
  label,
  a,
  b,
  mine,
  partner,
  hours = false,
}: {
  label: string
  a: number
  b: number
  mine: Profile
  partner: Profile
  hours?: boolean
}) {
  const entered = useEntered()
  const max = Math.max(a, b, 1)
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: hours ? 1 : 0 })
  return (
    <div className="grid grid-cols-[1fr_86px_1fr] items-center gap-2">
      <div className="flex justify-end" aria-hidden>
        <div
          className="h-2.5 rounded-full"
          style={{
            width: entered ? `${(a / max) * 100}%` : 0,
            background: `var(--${mine.accent})`,
            transition: 'width 1s var(--ease)',
          }}
        />
      </div>
      <div className="text-center text-xs leading-4">
        <p className="text-muted">{label}</p>
        <p
          className="num font-semibold"
          aria-label={`${mine.display_name}: ${format.format(a)}; ${partner.display_name}: ${format.format(b)}`}
        >
          {format.format(a)} · {format.format(b)}
        </p>
      </div>
      <div aria-hidden>
        <div
          className="h-2.5 rounded-full"
          style={{
            width: entered ? `${(b / max) * 100}%` : 0,
            background: `var(--${partner.accent})`,
            transition: 'width 1s var(--ease)',
          }}
        />
      </div>
    </div>
  )
}

function hoursInRange(sessions: Session[], readings: ReadingWithBook[], from: string, to: string) {
  const byId = new Map(readings.map((reading) => [reading.id, reading]))
  const minutes = sessions.reduce((total, session) => {
    if (session.read_on < from || session.read_on > to) return total
    const reading = byId.get(session.reading_id)
    if (!reading) return total
    return total + (reading.unit === 'minutes' ? session.end_pos - session.start_pos : (session.minutes ?? 0))
  }, 0)
  return minutes / 60
}

export function UsPage() {
  const { userId, profile, partner } = useMe()
  const myReadings = useReadings(userId)
  const theirReadings = useReadings(partner?.id)
  const mySessions = useSessions(userId)
  const theirSessions = useSessions(partner?.id)
  const sharedNotes = useQuery({
    queryKey: ['partner-shared-notes', partner?.id ?? ''],
    enabled: !!partner,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, reading_id, kind, created_at')
        .eq('user_id', partner!.id)
        .eq('shared', true)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as Pick<Note, 'id' | 'reading_id' | 'kind' | 'created_at'>[]
    },
  })
  const [period, setPeriod] = useState<Period>('week')
  const header = (
    <header className="flex min-h-11 items-center justify-between gap-3">
      <h1 className="font-serif text-[28px] font-semibold">Nosotros</h1>
      <div
        className="flex -space-x-2"
        aria-label={`${profile.display_name}${partner ? ` y ${partner.display_name}` : ''}`}
      >
        <span className="rounded-full ring-2 ring-bg">
          <Avatar person={profile} size={38} />
        </span>
        {partner && (
          <span className="rounded-full ring-2 ring-bg">
            <Avatar person={partner} size={38} />
          </span>
        )}
      </div>
    </header>
  )
  if (!partner) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState title="Un espacio para los dos">
          Cuando vuestros perfiles estén emparejados, aquí aparecerán vuestras lecturas.
        </EmptyState>
      </div>
    )
  }
  const queries = [myReadings, theirReadings, mySessions, theirSessions]
  if (queries.some((query) => query.isPending)) {
    return (
      <div className="space-y-4">
        {header}
        <div role="status" aria-label="Cargando vuestras lecturas" className="space-y-4 animate-pulse">
          <div className="h-11 rounded-xl bg-track" />
          <div className="h-52 rounded-[20px] bg-track" />
          <div className="h-24 rounded-[20px] bg-track" />
        </div>
      </div>
    )
  }
  if (queries.some((query) => query.isError)) {
    return (
      <div className="space-y-4">
        {header}
        <p>No se pudieron cargar vuestras lecturas.</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            for (const query of queries) void query.refetch()
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }
  const mine = myReadings.data ?? []
  const theirs = theirReadings.data ?? []
  const ms = mySessions.data ?? []
  const ps = theirSessions.data ?? []
  const today = todayISO()
  const range = { ...periodRange(period, today), to: today }
  const a = summarize(ms, mine, range)
  const b = summarize(ps, theirs, range)
  const myDay = ms.some((session) => session.read_on === today)
  const partnerDay = ps.some((session) => session.read_on === today)
  const headline =
    myDay && partnerDay
      ? 'Hoy habéis leído los dos 💚💙'
      : myDay || partnerDay
        ? `${myDay ? profile.display_name : partner.display_name} ya ha leído hoy`
        : 'Todavía estáis a tiempo de leer hoy'
  const theirById = new Map(theirs.map((reading) => [reading.id, reading]))
  const jointMine = mine.find(
    (reading) =>
      reading.status === 'reading' &&
      theirs.some((other) => other.book_id === reading.book_id && other.status === 'reading'),
  )
  const jointPartner =
    jointMine && theirs.find((reading) => reading.book_id === jointMine.book_id && reading.status === 'reading')
  const activity = [
    ...ps.flatMap((session) => {
      const reading = theirById.get(session.reading_id)
      return reading
        ? [
            {
              kind: 'session' as const,
              id: session.id,
              date: session.read_on,
              sort: session.created_at,
              reading,
              session,
            },
          ]
        : []
    }),
    ...theirs
      .filter((reading) => reading.status === 'finished' && reading.finished_on)
      .map((reading) => ({
        kind: 'reading' as const,
        id: reading.id,
        date: reading.finished_on!,
        sort: reading.updated_at,
        reading,
      })),
    ...(sharedNotes.data ?? []).flatMap((note) => {
      const reading = theirById.get(note.reading_id)
      return reading
        ? [
            {
              kind: 'note' as const,
              id: note.id,
              date: note.created_at.slice(0, 10),
              sort: note.created_at,
              reading,
              note,
            },
          ]
        : []
    }),
  ]
    .sort((x, y) => y.date.localeCompare(x.date) || y.sort.localeCompare(x.sort))
    .slice(0, 20)
  return (
    <div className="space-y-3.5">
      {header}
      <Segmented
        options={periods}
        value={period}
        onChange={setPeriod}
        aria-label="Periodo de comparación"
        className="[&_button]:min-h-11"
      />
      <section className="card space-y-3" aria-label="Vuestras lecturas cara a cara">
        <div className="flex justify-center gap-4 text-[13px] font-semibold">
          <span className="max-w-[45%] truncate" style={{ color: `var(--${profile.accent})` }}>
            {profile.display_name}
          </span>
          <span className="max-w-[45%] truncate" style={{ color: `var(--${partner.accent})` }}>
            {partner.display_name}
          </span>
        </div>
        <div key={period} className="space-y-3">
          <Comparison label="Páginas" a={a.pages} b={b.pages} mine={profile} partner={partner} />
          <Comparison label="Libros" a={a.booksFinished} b={b.booksFinished} mine={profile} partner={partner} />
          <Comparison label="Días" a={a.activeDays} b={b.activeDays} mine={profile} partner={partner} />
          <Comparison
            label="Horas"
            a={hoursInRange(ms, mine, range.from, range.to)}
            b={hoursInRange(ps, theirs, range.from, range.to)}
            mine={profile}
            partner={partner}
            hours
          />
        </div>
        <p className="text-center text-[11px] text-muted">{headline}</p>
      </section>
      {jointMine && jointPartner && (
        <Link
          to={`/libro/${jointMine.id}`}
          className="card pressable block space-y-3"
          aria-label={`Lectura conjunta: ${jointMine.book.title}`}
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <h2 className="shrink-0 font-semibold">Lectura conjunta</h2>
            <span className="truncate text-muted">{jointMine.book.title}</span>
          </div>
          <DualProgressBar
            a={{ value: progressFraction(jointMine), accent: profile.accent, label: profile.display_name }}
            b={{ value: progressFraction(jointPartner), accent: partner.accent, label: partner.display_name }}
          />
          <p className="text-xs text-muted">{jointDistance(jointMine, jointPartner, partner.display_name)}</p>
        </Link>
      )}
      {activity.length ? (
        <section className="card" aria-label={`Actividad de ${partner.display_name}`}>
          <div className="no-scrollbar max-h-[174px] overflow-y-auto divide-y divide-dashed divide-border">
            {activity.map((event) => (
              <article key={`${event.kind}-${event.id}`} className="flex min-h-[58px] items-center gap-2.5">
                <Link to={`/libro/${event.reading.id}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5">
                  <Avatar person={partner} size={30} />
                  <div className="min-w-0 text-[13px] leading-4">
                    {event.kind === 'session' ? (
                      <p className="line-clamp-2">
                        +{formatUnitDelta(event.reading.unit, event.session.end_pos - event.session.start_pos)} en{' '}
                        <strong>{event.reading.book.title}</strong>
                      </p>
                    ) : event.kind === 'reading' ? (
                      <div className="line-clamp-2">
                        Terminó <strong>{event.reading.book.title}</strong>
                        {event.reading.rating != null && (
                          <div className="ml-1 inline-flex items-center gap-1 align-middle">
                            <span aria-hidden>·</span>
                            <Stars value={event.reading.rating} size={12} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>Compartió una {event.note.kind === 'quote' ? 'cita' : 'nota'}</p>
                    )}
                  </div>
                </Link>
                <div className="flex min-h-11 shrink-0 items-center [&_button]:min-h-11">
                  <ReactionBar
                    targetType={event.kind === 'session' ? 'session' : 'reading'}
                    targetId={event.kind === 'session' ? event.session.id : event.reading.id}
                    ownerId={partner.id}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : sharedNotes.isPending ? (
        <p role="status" className="text-sm text-muted">
          Cargando actividad…
        </p>
      ) : (
        <EmptyState title={`${partner.display_name} aún no ha registrado nada`} />
      )}
      {sharedNotes.isError && <p className="text-xs text-muted">No se pudieron cargar las notas compartidas.</p>}
    </div>
  )
}
