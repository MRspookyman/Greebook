import { useState } from 'react'
import { Link } from 'react-router'
import { startOfMonth, startOfWeek, startOfYear } from 'date-fns'
import { useMe } from '@/features/auth/me'
import { MonthGrid } from '@/features/calendar/MonthGrid'
import { useReadings, useSessions } from '@/lib/data'
import { fmt, fromISODate, todayISO, toISODate } from '@/lib/dates'
import { activityByDay, summarize } from '@/lib/stats/aggregate'
import { level, levelColor } from '@/lib/stats/intensity'
import type { Profile, ReadingWithBook, Session } from '@/lib/types'
import { formatMinutes, formatPosition, formatUnitDelta, progressFraction } from '@/lib/units'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { ProgressBar } from '@/components/ProgressBar'
import { DualProgressBar } from '@/components/DualProgressBar'
import { EmptyState } from '@/components/EmptyState'
import { ReactionBar } from './ReactionBar'

type Period = 'Semana' | 'Mes' | 'Año'
const color = (p: Profile) => `var(--${p.accent})`

function Avatar({ person }: { person: Profile }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full font-serif text-2xl text-surface"
        style={{ background: color(person) }}
        aria-hidden="true"
      >
        {person.display_name.charAt(0).toUpperCase()}
      </span>
      <span>{person.display_name}</span>
    </div>
  )
}

function CurrentBooks({ person, readings }: { person: Profile; readings: ReadingWithBook[] }) {
  const current = readings.filter((r) => r.status === 'reading')
  return (
    <div className="card space-y-3">
      <h3 className="font-medium" style={{ color: color(person) }}>
        {person.display_name}
      </h3>
      {!current.length && <p className="text-muted">Todavía no hay una lectura en curso.</p>}
      {current.map((r) => (
        <Link key={r.id} to={`/libro/${r.id}`} className="flex min-h-11 gap-3">
          <Cover book={r.book} width={48} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-serif">{r.book.title}</p>
            <ProgressBar value={progressFraction(r)} color={color(person)} />
            <p className="text-sm text-muted">{formatPosition(r)}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

function SessionEntry({ session, reading, person }: { session: Session; reading?: ReadingWithBook; person: Profile }) {
  return (
    <article className="card space-y-2">
      <p className="text-sm" style={{ color: color(person) }}>
        {person.display_name} · {fmt(fromISODate(session.read_on), 'd MMM yyyy')}
      </p>
      {reading ? (
        <Link className="flex min-h-11 items-center gap-3" to={`/libro/${reading.id}`}>
          <Cover book={reading.book} width={36} />
          <span>
            <span className="block font-serif">{reading.book.title}</span>
            <span className="text-sm text-muted">
              +{formatUnitDelta(reading.unit, session.end_pos - session.start_pos)}
              {session.minutes != null ? ` · ${formatMinutes(session.minutes)}` : ''}
            </span>
          </span>
        </Link>
      ) : (
        <p>Sesión de lectura</p>
      )}
      <ReactionBar targetType="session" targetId={session.id} ownerId={person.id} />
    </article>
  )
}

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
  const max = Math.max(a, b, 1)
  const number = (n: number) => new Intl.NumberFormat('es', { maximumFractionDigits: hours ? 1 : 0 }).format(n)
  return (
    <div className="space-y-2">
      <h3 className="font-medium">{label}</h3>
      {[
        { person: mine, value: a },
        { person: partner, value: b },
      ].map(({ person, value }) => (
        <div key={person.id} className="space-y-1">
          <div className="flex justify-between gap-3 text-sm">
            <span>{person.display_name}</span>
            <span>
              {number(value)}
              {hours ? ' h' : ''}
            </span>
          </div>
          <div className="h-2 rounded-full bg-border">
            <div className="h-2 rounded-full" style={{ width: `${(value / max) * 100}%`, background: color(person) }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function UsPage() {
  const { userId, profile, partner } = useMe()
  const myReadings = useReadings(userId)
  const theirReadings = useReadings(partner?.id)
  const mySessions = useSessions(userId)
  const theirSessions = useSessions(partner?.id)
  const [period, setPeriod] = useState<Period>('Mes')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  if (!partner)
    return (
      <main className="space-y-6">
        <h1>Nosotros</h1>
        <EmptyState title="Un espacio para los dos">
          Cuando vuestros perfiles estén emparejados, aquí aparecerán vuestras lecturas.
        </EmptyState>
      </main>
    )
  const queries = [myReadings, theirReadings, mySessions, theirSessions]
  if (queries.some((q) => q.isPending))
    return (
      <main className="space-y-6">
        <h1>Nosotros</h1>
        <div role="status" aria-label="Cargando vuestras lecturas" className="space-y-4 animate-pulse">
          <div className="h-24 rounded-2xl bg-border" />
          <div className="h-48 rounded-2xl bg-border" />
          <div className="h-48 rounded-2xl bg-border" />
        </div>
      </main>
    )
  if (queries.some((q) => q.isError))
    return (
      <main className="space-y-6">
        <h1>Nosotros</h1>
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
      </main>
    )
  const mine = myReadings.data ?? []
  const theirs = theirReadings.data ?? []
  const ms = mySessions.data ?? []
  const ps = theirSessions.data ?? []
  const today = todayISO()
  const now = fromISODate(today)
  const from = toISODate(
    period === 'Semana'
      ? startOfWeek(now, { weekStartsOn: 1 })
      : period === 'Mes'
        ? startOfMonth(now)
        : startOfYear(now),
  )
  const range = { from, to: today }
  const a = summarize(ms, mine, range)
  const b = summarize(ps, theirs, range)
  const myDay = ms.some((s) => s.read_on === today)
  const partnerDay = ps.some((s) => s.read_on === today)
  const headline =
    myDay && partnerDay
      ? 'Hoy habéis leído los dos 💚💙'
      : myDay || partnerDay
        ? `${myDay ? profile.display_name : partner.display_name} ya ha leído hoy`
        : 'Todavía estáis a tiempo de leer hoy'
  const first = [...ms, ...ps].map((s) => s.read_on).sort()[0]
  const myActivity = activityByDay(ms, mine)
  const partnerActivity = activityByDay(ps, theirs)
  const blueActivity = profile.accent === 'blue' ? myActivity : partnerActivity
  const greenActivity = profile.accent === 'green' ? myActivity : partnerActivity
  const myById = new Map(mine.map((r) => [r.id, r]))
  const theirById = new Map(theirs.map((r) => [r.id, r]))
  const joint = mine
    .filter((r) => r.status === 'reading')
    .flatMap((r) => {
      const other = theirs.find((t) => t.book_id === r.book_id && t.status === 'reading')
      return other ? [{ mine: r, theirs: other }] : []
    })
  const activity = [
    ...ps.map((session) => ({ kind: 'session' as const, date: session.read_on, sort: session.created_at, session })),
    ...theirs
      .filter((r) => r.status === 'finished' && r.finished_on)
      .map((reading) => ({ kind: 'reading' as const, date: reading.finished_on!, sort: reading.updated_at, reading })),
  ]
    .sort((x, y) => y.date.localeCompare(x.date) || y.sort.localeCompare(x.sort))
    .slice(0, 20)
  const daySessions = [...ms, ...ps]
    .filter((s) => s.read_on === selectedDay)
    .sort((x, y) => x.created_at.localeCompare(y.created_at))
  return (
    <main className="space-y-8">
      <header className="space-y-4">
        <h1>Nosotros</h1>
        <div className="flex justify-center gap-10">
          <Avatar person={profile} />
          <Avatar person={partner} />
        </div>
        {first && (
          <p className="text-center text-muted">
            Leyendo juntos desde {fmt(fromISODate(first), "d 'de' MMMM 'de' yyyy")}
          </p>
        )}
      </header>
      <section className="space-y-3">
        <h2>Ahora mismo</h2>
        <CurrentBooks person={profile} readings={mine} />
        <CurrentBooks person={partner} readings={theirs} />
      </section>
      {joint.length > 0 && (
        <section className="space-y-3">
          <h2>Lectura conjunta</h2>
          {joint.map((pair) => (
            <div key={pair.mine.id} className="card space-y-2">
              <Link className="flex min-h-11 items-center font-serif" to={`/libro/${pair.mine.id}`}>
                {pair.mine.book.title}
              </Link>
              <DualProgressBar
                a={{ value: progressFraction(pair.mine), accent: profile.accent, label: profile.display_name }}
                b={{ value: progressFraction(pair.theirs), accent: partner.accent, label: partner.display_name }}
              />
              <p className="text-sm">
                {partner.display_name} va por {formatPosition(pair.theirs)}
              </p>
            </div>
          ))}
        </section>
      )}
      <section className="space-y-4">
        <h2>Vuestras lecturas</h2>
        <p>{headline}</p>
        <div className="flex gap-2" aria-label="Periodo de comparación">
          {(['Semana', 'Mes', 'Año'] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={`btn flex-1 ${period === p ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="card space-y-5">
          <Comparison
            label="Libros terminados"
            a={a.booksFinished}
            b={b.booksFinished}
            mine={profile}
            partner={partner}
          />
          <Comparison label="Páginas" a={a.pages} b={b.pages} mine={profile} partner={partner} />
          <Comparison
            label="Horas de escucha"
            a={a.audioMinutes / 60}
            b={b.audioMinutes / 60}
            mine={profile}
            partner={partner}
            hours
          />
          <Comparison label="Días con lectura" a={a.activeDays} b={b.activeDays} mine={profile} partner={partner} />
        </div>
      </section>
      <section className="space-y-3">
        <h2>Vuestro calendario</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {[profile, partner].map((p) => (
            <span key={p.id} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: color(p) }} />
              {p.display_name}
            </span>
          ))}
        </div>
        <MonthGrid
          month={month}
          onMonthChange={setMonth}
          onDayClick={setSelectedDay}
          renderDay={(iso) => (
            <div
              className="flex h-full min-h-11 w-full items-center justify-center rounded-xl text-ink"
              style={{
                background: `linear-gradient(to bottom right, ${levelColor(level(blueActivity.get(iso)?.score ?? 0), '--blue')} 50%, ${levelColor(level(greenActivity.get(iso)?.score ?? 0), '--green')} 50%)`,
              }}
            >
              {Number(iso.slice(-2))}
            </div>
          )}
        />
      </section>
      <section className="space-y-3">
        <h2>Actividad de {partner.display_name}</h2>
        {!activity.length && (
          <EmptyState title={`${partner.display_name} aún no ha registrado nada`}>
            <svg
              viewBox="0 0 100 64"
              className="mx-auto mb-3 h-16 w-24 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M50 54V15C38 6 19 9 8 15v39c13-7 27-7 42 0Zm0 0V15c12-9 31-6 42 0v39c-13-7-27-7-42 0Z" />
              <path d="M18 24c8-3 16-3 23 0m18 0c7-3 15-3 23 0" />
            </svg>
            Vuestras historias irán apareciendo aquí.
          </EmptyState>
        )}
        {activity.map((item) =>
          item.kind === 'session' ? (
            <SessionEntry
              key={`session:${item.session.id}`}
              session={item.session}
              reading={theirById.get(item.session.reading_id)}
              person={partner}
            />
          ) : (
            <article key={`reading:${item.reading.id}`} className="card space-y-3">
              <p className="text-sm text-muted">{fmt(fromISODate(item.date), 'd MMM yyyy')}</p>
              <Link className="flex min-h-11 items-center gap-3" to={`/libro/${item.reading.id}`}>
                <Cover book={item.reading.book} width={48} />
                <span>
                  {partner.display_name} ha terminado <span className="font-serif">«{item.reading.book.title}»</span>
                  {item.reading.rating != null ? ` · ${item.reading.rating.toLocaleString('es')} ★` : ''}
                </span>
              </Link>
              <ReactionBar targetType="reading" targetId={item.reading.id} ownerId={partner.id} />
            </article>
          ),
        )}
      </section>
      <BottomSheet
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? fmt(fromISODate(selectedDay), "d 'de' MMMM") : 'Sesiones del día'}
      >
        <div className="space-y-3">
          {daySessions.length === 0 && <p className="text-muted">Ese día aún no hay sesiones de lectura.</p>}
          {daySessions.map((session) => (
            <SessionEntry
              key={session.id}
              session={session}
              reading={(session.user_id === userId ? myById : theirById).get(session.reading_id)}
              person={session.user_id === userId ? profile : partner}
            />
          ))}
        </div>
      </BottomSheet>
    </main>
  )
}
