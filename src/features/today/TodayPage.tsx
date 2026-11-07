import { useRef, useState, type CSSProperties } from 'react'
import { ChevronRight, CloudUpload, Play, Plus } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router'
import { useMe } from '@/features/auth/me'
import { useInvites, useReadings, useSessions } from '@/lib/data'
import { fmt, greeting, todayISO } from '@/lib/dates'
import { currentStreak } from '@/lib/stats/streak'
import { timeSpent } from '@/lib/stats/aggregate'
import { dailySeries, estimatedFinish, weekDays } from '@/lib/stats/insights'
import { minutesLeft, pagesPerHour, roughDuration } from '@/lib/stats/personal'
import { formatDays, formatMinutes, formatUnitDelta, progressFraction } from '@/lib/units'
import type { Profile, ReadingWithBook, Session } from '@/lib/types'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'
import { Avatar } from '@/components/Avatar'
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

/** Ink for a day by the minutes read: the validated `--heat-*` ramp (less → more). */
function heatFor(minutes: number, read: boolean): string {
  if (!read) return 'transparent'
  if (minutes === 0) return 'var(--heat-2)'
  if (minutes < 20) return 'var(--heat-1)'
  if (minutes < 35) return 'var(--heat-2)'
  if (minutes < 50) return 'var(--heat-3)'
  if (minutes < 70) return 'var(--heat-4)'
  return 'var(--heat-5)'
}

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
  const forMe = usePendingForMe()
  const priority = forMe.items.find((item) => item.type === 'invite') ?? forMe.items[0]
  const inlineInvite =
    priority?.type === 'invite'
      ? priority.invite
      : invites.data?.find(
          (invite) => invite.from_user === userId && invite.status === 'accepted' && !isInviteExpired(invite),
        )
  const week = weekDays(today)
  const weekRange = { from: week[0], to: week[6] }
  const series = dailySeries(sessions.data ?? [], readings.data ?? [], weekRange)
  const weeklyPages = series.reduce((sum, day) => sum + day.pages, 0)
  const weeklyMinutes = timeSpent(sessions.data ?? [], readings.data ?? [], weekRange)
  const finished = (readings.data ?? []).filter(
    (r) => r.status === 'finished' && r.finished_on?.startsWith(today.slice(0, 4)),
  ).length
  const goal = profile.yearly_goal
  const pace = pagesPerHour(readings.data ?? [], sessions.data ?? [])
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
  const minutesByDay = new Map(
    week.map((date) => [date, timeSpent(sessions.data ?? [], readings.data ?? [], { from: date, to: date })]),
  )

  return (
    <div className="flex flex-col gap-5">
      <header className="enter flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
          <h1 className="mt-0.5 truncate text-[27px]">
            {greeting()}, <span className="display-italic text-[27px]">{profile.display_name}</span>
          </h1>
        </div>
        <Link
          to="/perfil"
          className="-mr-1.5 flex min-h-11 min-w-11 flex-none items-center justify-center"
          aria-label="Tu perfil"
        >
          <Avatar person={profile} size={36} />
        </Link>
      </header>

      {partner && inlineInvite ? (
        <div className="enter rounded-[14px] bg-surface px-4 py-2 shadow-[var(--paper-shadow)]">
          <InviteCard invite={inlineInvite} compact />
        </div>
      ) : (
        partner &&
        (priority || (live && liveReading) || (latest && latestReading)) && (
          <PartnerLine
            partner={partner}
            text={
              priority
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
                    : ''
            }
            live={live && !priority}
            to={pendingId ? `/nosotros#m-${pendingId}` : '/nosotros'}
            readAlong={readAlong ? () => read(readAlong) : undefined}
          />
        )
      )}

      {readings.isPending ? (
        <div className="h-64 animate-pulse rounded-[18px] bg-soft" role="status" aria-label="Cargando lecturas" />
      ) : readings.isError && !readings.data ? (
        <p className="text-sm text-danger">No se pudieron cargar tus libros. Inténtalo al volver a conectarte.</p>
      ) : active.length === 0 ? (
        <section className="rounded-[18px] bg-surface shadow-[var(--paper-shadow)]">
          <EmptyState title="Aún no estás leyendo nada">
            <Link className="btn btn-primary mt-3" to="/biblioteca/buscar">
              Buscar un libro
            </Link>
          </EmptyState>
        </section>
      ) : (
        <NowReading
          readings={active}
          sessions={sessions.data ?? []}
          pace={pace}
          accent={profile.accent}
          today={today}
          onRead={read}
        />
      )}

      <section className="enter" style={{ '--i': 2 } as CSSProperties} aria-labelledby="week-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="week-title" className="font-sans text-[15px] font-semibold tracking-normal">
            Esta semana
          </h2>
          <p className="text-[13px] text-muted">
            {weeklyMinutes > 0 ? formatMinutes(weeklyMinutes) : `${weeklyPages} págs`}
            {' · '}
            {dates.has(today)
              ? `${formatDays(streak)} seguidos`
              : streak > 0
                ? `racha de ${formatDays(streak)}`
                : 'hoy, cuando quieras'}
          </p>
        </div>
        <ol className="mt-3 grid grid-cols-7 gap-1.5">
          {week.map((date, index) => {
            const done = dates.has(date)
            const theirs = partnerDates.has(date)
            const minutes = minutesByDay.get(date) ?? 0
            const isToday = date === today
            return (
              <li
                key={date}
                className="flex flex-col items-center gap-1.5"
                aria-label={`${fmt(date, 'EEEE')}: ${done ? (minutes ? `${minutes} minutos` : 'leíste') : 'sin lectura'}${
                  partner && theirs ? `; ${partner.display_name} también leyó` : ''
                }`}
              >
                <span className={`text-xs ${isToday ? 'font-semibold text-ink' : 'text-muted'}`} aria-hidden>
                  {DAYS[index]}
                </span>
                <span
                  aria-hidden
                  className="grow-y relative block h-9 w-full rounded-[10px]"
                  style={{
                    background: heatFor(minutes, done),
                    boxShadow: isToday
                      ? 'inset 0 0 0 1.5px var(--ink)'
                      : done
                        ? undefined
                        : 'inset 0 0 0 1px var(--rule)',
                    animationDelay: `${150 + index * 40}ms`,
                  }}
                >
                  {partner && theirs && (
                    <span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--bg)]"
                      style={{ background: `var(--${partner.accent})` }}
                    />
                  )}
                </span>
                <span className="min-h-4 text-xs text-muted" aria-hidden>
                  {done ? (minutes ? `${minutes}′` : '✓') : ''}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <Link
        to="/stats"
        className="enter flex min-h-11 items-center gap-3"
        style={{ '--i': 3 } as CSSProperties}
        aria-label={`${finished} de ${goal} libros en ${today.slice(0, 4)}. Ver estadísticas`}
      >
        <span className="flex-none text-[14px]">
          <span className="figure text-[17px]">{finished}</span> <span className="text-muted">de {goal} libros en {today.slice(0, 4)}</span>
        </span>
        <ProgressBar value={goal ? finished / goal : 0} className="h-[6px] flex-1" label="Objetivo del año" />
        <ChevronRight size={18} className="flex-none text-muted" aria-hidden />
      </Link>

      {pending > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted" role="status">
          <CloudUpload size={13} aria-hidden />
          {pending} {pending === 1 ? 'sesión pendiente' : 'sesiones pendientes'} de sincronizar
        </p>
      )}
    </div>
  )
}

function PartnerLine({
  partner,
  text,
  live,
  to,
  readAlong,
}: {
  partner: Profile
  text: string
  live: boolean
  to: string
  readAlong?: () => void
}) {
  return (
    <div className="enter flex min-h-[52px] items-center gap-2 rounded-[14px] bg-surface pr-2 pl-3 shadow-[var(--paper-shadow)]">
      <Link to={to} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-[14px]">
        <span className="relative flex-none">
          <Avatar person={partner} size={30} />
          {live && (
            <span
              className="live-dot absolute -right-0.5 -bottom-0.5 ring-2 ring-[var(--surface)]"
              style={{ color: `var(--${partner.accent})` }}
              aria-hidden
            />
          )}
        </span>
        <span className="line-clamp-2">
          <span className="font-medium">{partner.display_name}</span> {text}
        </span>
        {!readAlong && <ChevronRight size={18} className="ml-auto flex-none text-muted" aria-hidden />}
      </Link>
      {readAlong && (
        <button type="button" className="btn btn-outline min-h-10 flex-none px-3 text-[13px]" onClick={readAlong}>
          Leer a la vez
        </button>
      )}
    </div>
  )
}

function NowReading({
  readings,
  sessions,
  pace,
  accent,
  today,
  onRead,
}: {
  readings: ReadingWithBook[]
  sessions: Session[]
  pace: number | null
  accent: 'blue' | 'green'
  today: string
  onRead: (reading: ReadingWithBook) => void
}) {
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const many = readings.length > 1
  function onScroll() {
    const el = track.current
    const first = el?.firstElementChild as HTMLElement | null
    if (!el || !first) return
    setIndex(Math.min(readings.length - 1, Math.round(el.scrollLeft / (first.offsetWidth + 12))))
  }
  function go(to: number) {
    const el = track.current
    const first = el?.firstElementChild as HTMLElement | null
    if (!el || !first) return
    el.scrollTo({ left: to * (first.offsetWidth + 12), behavior: 'smooth' })
  }
  return (
    <section className="enter" style={{ '--i': 1 } as CSSProperties} aria-labelledby="now-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="now-title" className="font-sans text-[15px] font-semibold tracking-normal">
          Leyendo ahora
        </h2>
        {many && (
          <p className="text-[13px] text-muted" aria-live="polite">
            {index + 1} de {readings.length}
          </p>
        )}
      </div>
      <div
        ref={track}
        onScroll={onScroll}
        className="no-scrollbar -mx-[22px] mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[22px] px-[22px] pb-2"
      >
        {readings.map((reading) => (
          <ReadingCard
            key={reading.id}
            reading={reading}
            sessions={sessions}
            pace={pace}
            accent={accent}
            today={today}
            onRead={() => onRead(reading)}
            width={many ? 'calc(100% - 30px)' : '100%'}
          />
        ))}
      </div>
      {many && (
        <div className="-mt-2 -mb-3 flex justify-center" role="group" aria-label="Elegir libro">
          {readings.map((reading, dot) => (
            <button
              key={reading.id}
              type="button"
              aria-label={`Ver ${reading.book.title}`}
              aria-current={dot === index ? 'true' : undefined}
              onClick={() => go(dot)}
              className="grid h-11 w-11 place-items-center"
            >
              <span
                className="block h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: dot === index ? 16 : 6,
                  background: dot === index ? 'var(--ink)' : 'var(--rule)',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ReadingCard({
  reading,
  sessions,
  pace,
  accent,
  today,
  onRead,
  width,
}: {
  reading: ReadingWithBook
  sessions: Session[]
  pace: number | null
  accent: 'blue' | 'green'
  today: string
  onRead: () => void
  width: string
}) {
  const fraction = progressFraction(reading)
  const timer = useActiveTimer()
  const mine = timer?.readingId === reading.id ? timer : null
  const seconds = useElapsedSeconds(mine)
  const audio = reading.format === 'audio'
  const left = minutesLeft(reading, sessions, pace)
  const finish = estimatedFinish(reading, sessions, today)
  const timeLine = audio
    ? `te quedan ${formatMinutes(reading.total_units - reading.current_position)}`
    : left
      ? `a tu ritmo, ${roughDuration(left)} para acabarlo`
      : finish
        ? `lo acabas hacia el ${fmt(finish, 'd MMM')}`
        : 'apunta una sesión para conocer tu ritmo'
  return (
    <article
      className="flex-none snap-center rounded-[18px] bg-surface p-4 shadow-[var(--paper-shadow)]"
      style={{ width }}
      aria-label={reading.book.title}
    >
      <div className="flex gap-4">
        <Link to={`/libro/${reading.id}`} aria-label={`Abrir ${reading.book.title}`} viewTransition className="flex-none">
          <Cover book={reading.book} width={88} priority ribbon={accent} transitionName={`cover-${reading.id}`} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/libro/${reading.id}`} viewTransition>
            <h3 className="line-clamp-2 font-serif text-[20px] leading-[1.15] tracking-[-0.01em]">{reading.book.title}</h3>
          </Link>
          <p className="mt-1 truncate text-[13px] text-muted">{reading.book.authors.join(', ')}</p>
          <p className="mt-3 text-[14px]">
            <span className="font-semibold">{Math.round(fraction * 100)} %</span>{' '}
            <span className="text-muted">
              ·{' '}
              {reading.unit === 'pages'
                ? `p. ${reading.current_position} de ${reading.total_units}`
                : `${formatMinutes(reading.current_position)} de ${formatMinutes(reading.total_units)}`}
            </span>
          </p>
          <Link
            to={`/leer/${reading.id}?modo=paginas`}
            aria-label={`${audio ? 'Apuntar tiempo' : 'Apuntar páginas'} de «${reading.book.title}»`}
            className="-my-[19px] block py-[19px]"
          >
            <ProgressBar value={fraction} className="h-[6px]" />
          </Link>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">{timeLine}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {mine ? (
          <Link
            to={`/leer/${reading.id}`}
            className="btn btn-primary"
            aria-label={`Volver a tu sesión de «${reading.book.title}»`}
          >
            {mine.pausedAt == null && <span className="live-dot" aria-hidden />}
            {mine.pausedAt == null ? (audio ? 'Escuchando' : 'Leyendo') : 'En pausa'} ·{' '}
            <span className="[font-variant-numeric:lining-nums_tabular-nums]">{formatClock(seconds)}</span>
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onRead}>
            <Play size={15} fill="currentColor" aria-hidden />
            {audio ? 'Escuchar' : 'Leer'}
          </button>
        )}
        <Link to={`/leer/${reading.id}?modo=paginas`} className="btn btn-outline whitespace-nowrap px-3">
          <Plus size={16} aria-hidden />
          Apuntar
        </Link>
      </div>
    </article>
  )
}
