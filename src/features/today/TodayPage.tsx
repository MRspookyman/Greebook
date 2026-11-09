import type { CSSProperties } from 'react'
import { ChevronRight, CloudUpload, Play, Plus } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router'
import { useMe } from '@/features/auth/me'
import { useInvites, useReadings, useSessions } from '@/lib/data'
import { fmt, greeting, todayISO } from '@/lib/dates'
import { currentStreak } from '@/lib/stats/streak'
import { dailySeries, estimatedFinish, pacePerDay, weekDays } from '@/lib/stats/insights'
import { formatDays, formatLabel, formatPosition, formatUnitDelta, progressFraction } from '@/lib/units'
import type { ReadingWithBook, Session } from '@/lib/types'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'
import { Avatar } from '@/components/Avatar'
import { CountUp } from '@/components/CountUp'
import { Cover } from '@/components/Cover'
import { ProgressBar } from '@/components/ProgressBar'
import { EmptyState } from '@/components/EmptyState'
import { startTimer, useActiveTimer, useElapsedSeconds } from '@/features/session/Timer'
import { formatClock } from '@/lib/timer'
import { usePendingForMe } from '@/features/us/messages'
import { InviteCard } from '@/features/us/InviteCard'
import { isInviteExpired } from '@/features/us/ratito'
import { recentReadings } from './recentReadings'

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function TodayPage() {
  const { userId, profile, partner } = useMe()
  const readings = useReadings(userId)
  const sessions = useSessions(userId)
  const partnerReadings = useReadings(partner?.id)
  const partnerSessions = useSessions(partner?.id)
  const invites = useInvites()
  const pending = usePendingSessionCount()
  const navigate = useNavigate()
  const read = (reading: ReadingWithBook) => {
    if (startTimer(reading)) navigate(`/leer/${reading.id}`)
  }
  const today = todayISO()
  const dateLabel = fmt(today, "EEEE, d 'de' MMMM")
  const active = recentReadings(
    (readings.data ?? []).filter((r) => r.status === 'reading'),
    sessions.data ?? [],
  )
  const dates = new Set(sessions.data?.map((s) => s.read_on) ?? [])
  const streak = currentStreak(dates, today)
  const partnerDates = new Set(partnerSessions.data?.map((s) => s.read_on) ?? [])
  const duo = [...dates].filter((date) => date.startsWith(today.slice(0, 7)) && partnerDates.has(date)).length
  const forMe = usePendingForMe()
  const priority = forMe.items.find((item) => item.type === 'invite') ?? forMe.items[0]
  const inlineInvite =
    priority?.type === 'invite'
      ? priority.invite
      : invites.data?.find(
          (invite) => invite.from_user === userId && invite.status === 'accepted' && !isInviteExpired(invite),
        )
  const week = weekDays(today)
  const series = dailySeries(sessions.data ?? [], readings.data ?? [], { from: week[0], to: week[6] })
  const weeklyPages = series.reduce((sum, day) => sum + day.pages, 0)
  const finished = (readings.data ?? []).filter(
    (r) => r.status === 'finished' && r.finished_on?.startsWith(today.slice(0, 4)),
  ).length
  const goal = profile.yearly_goal
  const latest = partnerSessions.data?.reduce<Session | null>(
    (last, session) => (!last || session.created_at > last.created_at ? session : last),
    null,
  )
  const latestReading = partnerReadings.data?.find((r) => r.id === latest?.reading_id)
  const liveReading = partnerReadings.data?.find((reading) => reading.id === partner?.reading_now_id)
  const live =
    !!partner?.reading_now_since && Date.now() - new Date(partner.reading_now_since).getTime() < 2 * 60 * 60 * 1000
  // A gentle way to answer presence: start your own timer, on the same book when you share it.
  const timer = useActiveTimer()
  const readAlong =
    live && liveReading && !priority && !timer
      ? (active.find((reading) => reading.book_id === liveReading.book_id) ?? active[0])
      : undefined
  const pendingId = priority
    ? priority.type === 'message'
      ? priority.message.id
      : priority.type === 'invite'
        ? priority.invite.id
        : priority.type === 'together'
          ? priority.item.id
          : null
    : null

  return (
    <div className="space-y-5">
      <header className="enter">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
          <Link
            to="/perfil"
            className="-mr-1.5 flex min-h-11 min-w-11 items-center justify-center"
            aria-label="Tu perfil"
          >
            <Avatar person={profile} size={32} />
          </Link>
        </div>
        <h1 className="display mt-1">
          {greeting()},
          <br />
          <span className="display-italic">{profile.display_name}</span>
        </h1>
      </header>

      {partner && inlineInvite ? (
        <div className="rule pt-3">
          <InviteCard invite={inlineInvite} compact />
        </div>
      ) : (
        partner &&
        (priority || (live && liveReading) || (latest && latestReading)) && (
          <div className="rule enter flex min-h-11 items-center gap-2 pt-3">
            <Link
              to={pendingId ? `/nosotros#m-${pendingId}` : '/nosotros'}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-xs"
            >
              <span className="relative">
                <Avatar person={partner} size={28} />
                {live && !priority && (
                  <span
                    className="live-dot absolute -right-0.5 -bottom-0.5 ring-2 ring-[var(--bg)]"
                    style={{ color: `var(--${partner.accent})` }}
                    aria-hidden
                  />
                )}
              </span>
              <span className="line-clamp-2">
                {partner.display_name}{' '}
                {priority
                  ? priority.type === 'invite'
                    ? 'te invita a un ratito'
                    : priority.type === 'together'
                      ? 'quiere leer contigo'
                      : priority.type === 'goal'
                        ? 'te propone un reto para los dos'
                        : `te dejó algo · ${forMe.count}`
                  : live && liveReading
                    ? `está leyendo «${liveReading.book.title}»`
                    : latest && latestReading
                      ? `leyó ${formatUnitDelta(latestReading.unit, latest.end_pos - latest.start_pos)} ${formatDistanceToNowStrict(new Date(latest.created_at), { addSuffix: true, locale: es })}`
                      : ''}
              </span>
              {!readAlong && <ChevronRight size={16} className="ml-auto shrink-0" aria-hidden />}
            </Link>
            {readAlong && (
              <button type="button" className="btn btn-outline shrink-0 px-3 text-xs" onClick={() => read(readAlong)}>
                Leer a la vez
              </button>
            )}
          </div>
        )
      )}

      {readings.isPending ? (
        <div className="rule h-56 animate-pulse bg-soft" role="status" aria-label="Cargando lecturas" />
      ) : readings.isError && !readings.data ? (
        <p className="text-sm text-danger">No se pudieron cargar tus libros. Inténtalo al volver a conectarte.</p>
      ) : active.length === 0 ? (
        <section className="rule pt-5">
          <EmptyState title="Aún no estás leyendo nada">
            <Link className="btn btn-primary mt-3" to="/biblioteca/buscar">
              Buscar un libro
            </Link>
          </EmptyState>
        </section>
      ) : (
        <section className="rule enter pt-4" style={{ '--i': 1 } as CSSProperties} aria-label="Tus lecturas actuales">
          <CurrentReading
            reading={active[0]}
            accent={profile.accent}
            sessions={sessions.data ?? []}
            today={today}
            onRead={() => read(active[0])}
          />
          {active.slice(1).map((reading) => (
            <div key={reading.id} className="rule mt-3 flex min-h-14 items-center gap-3 pt-3">
              <Link to={`/libro/${reading.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Cover book={reading.book} width={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-lg leading-tight">{reading.book.title}</span>
                  <span className="text-xs text-muted">
                    {formatPosition(reading)} · {Math.round(progressFraction(reading) * 100)} %
                  </span>
                </span>
              </Link>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Leer «${reading.book.title}»`}
                onClick={() => read(reading)}
              >
                <Play size={16} aria-hidden />
              </button>
            </div>
          ))}
        </section>
      )}

      <section
        className="rule enter space-y-3 pt-4"
        style={{ '--i': 2 } as CSSProperties}
        aria-label="Tu racha de lectura"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs">
            {dates.has(today)
              ? 'Hoy ya has leído'
              : streak === 0
                ? 'Cuando te apetezca, un ratito'
                : 'Un ratito para ti, cuando quieras'}
          </p>
          {streak > 0 && <span className="folio shrink-0 text-amber-ink">{formatDays(streak)}</span>}
        </div>
        {partner && duo > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${profile.accent === 'blue' ? 'bg-blue' : 'bg-green'}`}
              aria-hidden
            />
            <span
              className={`h-1.5 w-1.5 rounded-full ${partner.accent === 'blue' ? 'bg-blue' : 'bg-green'}`}
              aria-hidden
            />
            {formatDays(duo)} leyendo los dos este mes
          </p>
        )}
        <div className="grid grid-cols-7 gap-2">
          {week.map((date, index) => {
            const done = dates.has(date)
            const theirs = partnerDates.has(date)
            return (
              <div
                key={date}
                className="flex flex-col items-center gap-2 text-xs text-muted"
                aria-label={`${fmt(date, 'EEEE')}: ${
                  partner
                    ? done && theirs
                      ? 'leísteis los dos'
                      : done
                        ? 'leíste tú'
                        : theirs
                          ? `leyó ${partner.display_name}`
                          : 'sin sesiones'
                    : done
                      ? 'leído'
                      : 'sin sesión'
                }`}
              >
                <span className="flex h-3 items-end gap-1" aria-hidden>
                  <span
                    className={`grow-y h-3 w-1.5 rounded-sm ${
                      done ? (profile.accent === 'blue' ? 'bg-blue' : 'bg-green') : 'bg-border'
                    }`}
                    style={{ animationDelay: `${200 + index * 45}ms` }}
                  />
                  {partner && (
                    <span
                      className={`grow-y h-3 w-1.5 rounded-sm ${
                        theirs ? (partner.accent === 'blue' ? 'bg-blue' : 'bg-green') : 'bg-border'
                      }`}
                      style={{ animationDelay: `${230 + index * 45}ms` }}
                    />
                  )}
                </span>
                <span className={date === today ? 'text-ink underline underline-offset-4' : undefined}>
                  {DAYS[index]}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section
        className="rule enter grid grid-cols-2 pt-3"
        style={{ '--i': 3 } as CSSProperties}
        aria-label="Resumen de lectura"
      >
        <Link
          to="/perfil"
          className="min-h-14 pr-4"
          aria-label={`${finished} de ${goal} libros en ${today.slice(0, 4)}. Editar objetivo`}
        >
          <p className="folio text-[28px]">
            <CountUp value={finished} /> <span className="text-muted">/ {goal}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {finished === 1 ? 'libro' : 'libros'} en {today.slice(0, 4)}
          </p>
        </Link>
        <Link
          to="/stats"
          className="min-h-14 border-l border-rule pl-5"
          aria-label={`Esta semana ${weeklyPages} páginas. Ver estadísticas`}
        >
          <p className="folio text-[28px]">
            <CountUp value={weeklyPages} /> <span className="text-base">pág</span>
          </p>
          <p className="mt-1 text-xs text-muted">Esta semana</p>
        </Link>
      </section>
      {pending > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted" role="status">
          <CloudUpload size={13} aria-hidden />
          {pending} {pending === 1 ? 'sesión pendiente' : 'sesiones pendientes'} de sincronizar
        </p>
      )}
    </div>
  )
}

function CurrentReading({
  reading,
  accent,
  sessions,
  today,
  onRead,
}: {
  reading: ReadingWithBook
  accent: 'blue' | 'green'
  sessions: Session[]
  today: string
  onRead: () => void
}) {
  const pace = pacePerDay(reading, sessions, today)
  const finish = estimatedFinish(reading, sessions, today)
  const fraction = progressFraction(reading)
  const timer = useActiveTimer()
  const mine = timer?.readingId === reading.id ? timer : null
  const seconds = useElapsedSeconds(mine)
  return (
    <article className="space-y-3">
      <div className="flex items-start gap-4">
        <Link to={`/libro/${reading.id}`} aria-label={`Abrir ${reading.book.title}`}>
          <Cover book={reading.book} width={80} priority ribbon={accent} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/libro/${reading.id}`}>
            <h2 className="title">{reading.book.title}</h2>
          </Link>
          <p className="mt-2 text-xs text-muted">{reading.book.authors.join(', ')}</p>
          <p className="folio mt-4">
            {reading.unit === 'pages' ? (
              <>
                p. {reading.current_position} <span className="text-muted">— {reading.total_units}</span>
              </>
            ) : (
              formatPosition(reading)
            )}
          </p>
          <div className="mt-4">
            <ProgressBar value={fraction} />
          </div>
          <p className="mt-2 text-xs text-muted">
            <span className="text-accent">{Math.round(fraction * 100)} %</span> ·{' '}
            {pace === null ? 'Sin ritmo aún' : `${Math.round(pace)} ${reading.unit === 'percent' ? '%' : 'pág'}/día`}
          </p>
        </div>
      </div>
      <div className="flex justify-between gap-3 text-xs text-muted">
        <span>
          {finish ? `lo acabas hacia el ${fmt(finish, 'd MMM')}` : 'registra para conocer tu ritmo'}
        </span>
        <span>{formatLabel(reading.format)}</span>
      </div>
      <div className="flex gap-3">
        {mine ? (
          <Link
            to={`/leer/${reading.id}`}
            className="btn btn-primary flex-1"
            aria-label={`Volver a tu sesión de «${reading.book.title}»`}
          >
            {mine.pausedAt == null && <span className="live-dot" aria-hidden />}
            {mine.pausedAt == null ? 'Leyendo' : 'En pausa'} ·{' '}
            <span className="[font-variant-numeric:lining-nums_tabular-nums]">{formatClock(seconds)}</span>
          </Link>
        ) : (
          <button type="button" className="btn btn-primary flex-1" onClick={onRead}>
            <Play size={15} fill="currentColor" aria-hidden />
            Leer
          </button>
        )}
        <Link to={`/leer/${reading.id}?modo=paginas`} className="btn btn-outline flex-1 whitespace-nowrap px-3">
          <Plus size={16} aria-hidden />
          {reading.unit === 'percent' ? 'Apuntar porcentaje' : 'Apuntar páginas'}
        </Link>
      </div>
    </article>
  )
}
