import { useRef, useState, type CSSProperties } from 'react'
import { Check, CloudUpload, Flame, Hand, Plus } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router'
import { useMe } from '@/features/auth/me'
import { useReadings, useSessions } from '@/lib/data'
import { fmt, greeting, todayISO } from '@/lib/dates'
import { currentStreak } from '@/lib/stats/streak'
import { coupleStreak } from '@/lib/club'
import { dailySeries, estimatedFinish, pacePerDay, weekDays } from '@/lib/stats/insights'
import { formatDays, formatMinutes, formatPosition, formatUnitDelta, progressFraction } from '@/lib/units'
import type { ReadingWithBook, Session } from '@/lib/types'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'
import { Avatar } from '@/components/Avatar'
import { Cover } from '@/components/Cover'
import { Ring } from '@/components/Ring'
import { ProgressBar } from '@/components/ProgressBar'
import { EmptyState } from '@/components/EmptyState'
import { LogSessionSheet } from '@/features/session/LogSessionSheet'
import { Timer } from '@/features/session/Timer'
import { ReactionBar } from '@/features/us/ReactionBar'
import { NudgeSheet, useNudgedToday } from '@/features/us/NudgeSheet'
import { TodayCouple } from '@/features/us/TodayCouple'
import { recentReadings } from './recentReadings'

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function TodayPage() {
  const { userId, profile, partner } = useMe()
  const readings = useReadings(userId)
  const sessions = useSessions(userId)
  const partnerReadings = useReadings(partner?.id)
  const partnerSessions = useSessions(partner?.id)
  const pending = usePendingSessionCount()
  const [logging, setLogging] = useState<ReadingWithBook | null>(null)
  const [cardIndex, setCardIndex] = useState(0)
  const carousel = useRef<HTMLDivElement>(null)
  const today = todayISO()
  const dateLabel = fmt(today, "EEEE, d 'de' MMMM")
  const active = recentReadings(
    (readings.data ?? []).filter((r) => r.status === 'reading'),
    sessions.data ?? [],
  )
  const dates = new Set(sessions.data?.map((s) => s.read_on) ?? [])
  const streak = currentStreak(dates, today)
  const partnerDates = new Set(partnerSessions.data?.map((s) => s.read_on) ?? [])
  const duo = coupleStreak(dates, partnerDates, today)
  const [nudging, setNudging] = useState(false)
  const nudged = useNudgedToday()
  const late = new Date().getHours() >= 19
  const week = weekDays(today)
  const series = dailySeries(sessions.data ?? [], readings.data ?? [], { from: week[0], to: week[6] })
  const weeklyPages = series.reduce((sum, day) => sum + day.pages, 0)
  const maxPages = Math.max(1, ...series.map((day) => day.pages))
  const finished = (readings.data ?? []).filter(
    (r) => r.status === 'finished' && r.finished_on?.startsWith(today.slice(0, 4)),
  ).length
  const goal = profile.yearly_goal
  const latest = partnerSessions.data?.reduce<Session | null>(
    (last, session) => (!last || session.created_at > last.created_at ? session : last),
    null,
  )
  const latestReading = partnerReadings.data?.find((r) => r.id === latest?.reading_id)
  const partnerToday = partnerSessions.data?.some((session) => session.read_on === today)

  return (
    <div className="space-y-3.5">
      <header className="rise flex items-center justify-between gap-2" style={{ '--k': 0 } as CSSProperties}>
        <div className="min-w-0">
          <p className="text-xs text-muted">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
          <h1 className="mt-0.5 font-serif text-[25px] font-semibold leading-tight">
            {greeting()}, {profile.display_name}
          </h1>
        </div>
        <Link
          to="/perfil"
          className="pressable flex min-h-11 min-w-11 items-center justify-center"
          aria-label="Tu perfil"
        >
          <Avatar person={profile} size={40} />
        </Link>
      </header>

      <section className="card rise space-y-3" style={{ '--k': 1 } as CSSProperties} aria-label="Tu racha de lectura">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-amber"
            style={{ background: 'color-mix(in oklab, var(--amber) 14%, var(--surface))' }}
          >
            <Flame size={14} fill="currentColor" aria-hidden />
            {formatDays(streak)}
          </span>
          {partner && duo > 0 && (
            <span
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber"
              aria-label={`${formatDays(duo)} leyendo los dos`}
            >
              <span className="flex -space-x-1" aria-hidden>
                <span
                  className="h-3 w-3 rounded-full ring-2 ring-surface"
                  style={{ background: `var(--${profile.accent})` }}
                />
                <span
                  className="h-3 w-3 rounded-full ring-2 ring-surface"
                  style={{ background: `var(--${partner.accent})` }}
                />
              </span>
              {formatDays(duo)} juntos
            </span>
          )}
          <p className="text-xs text-muted">
            {dates.has(today)
              ? 'Hoy ya has leído'
              : streak === 0
                ? 'Empieza tu racha hoy'
                : 'Lee hoy para no perder la racha'}
          </p>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((date, index) => {
            const done = dates.has(date)
            const theirs = partnerDates.has(date)
            const both = done && theirs
            const isToday = date === today
            return (
              <div
                key={`${date}-${done}-${theirs}`}
                className="flex flex-col items-center gap-1 text-[11px] text-muted"
                aria-label={`${fmt(date, 'EEEE')}: ${
                  partner
                    ? both
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
                {partner ? (
                  <span
                    className={`relative grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-border ${
                      isToday && !both ? 'outline-2 outline-offset-2 outline-dashed outline-muted' : ''
                    }`}
                    style={{
                      boxShadow: both ? '0 0 0 2px var(--surface), 0 0 0 3.5px var(--amber)' : undefined,
                      animation: isToday ? (both ? 'gb-pop .45s var(--spring)' : undefined) : undefined,
                    }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-1/2 transition-colors duration-500"
                      style={{ background: done ? `var(--${profile.accent})` : 'transparent' }}
                    />
                    <span
                      className="absolute inset-y-0 right-0 w-1/2 transition-colors duration-500"
                      style={{ background: theirs ? `var(--${partner.accent})` : 'transparent' }}
                    />
                  </span>
                ) : (
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full ${
                      done
                        ? 'bg-accent text-surface'
                        : isToday
                          ? 'border-2 border-dashed border-accent bg-surface'
                          : 'bg-border'
                    }`}
                    style={{
                      animation: isToday
                        ? done
                          ? 'gb-pop .45s var(--spring)'
                          : 'gb-breathe 2s var(--ease) infinite'
                        : undefined,
                    }}
                  >
                    {done && <Check size={17} strokeWidth={3} aria-hidden />}
                  </span>
                )}
                {DAYS[index]}
              </div>
            )
          })}
        </div>
      </section>

      {readings.isPending ? (
        <div className="card h-[218px] animate-pulse" aria-label="Cargando lecturas" />
      ) : readings.isError && !readings.data ? (
        <p className="text-sm text-danger">No se pudieron cargar tus libros. Inténtalo al volver a conectarte.</p>
      ) : active.length === 0 ? (
        <div className="card">
          <EmptyState title="Aún no estás leyendo nada">
            <Link className="btn btn-primary mt-3" to="/biblioteca/buscar">
              Buscar un libro
            </Link>
          </EmptyState>
        </div>
      ) : (
        <section className="rise" style={{ '--k': 2 } as CSSProperties} aria-label="Tus lecturas actuales">
          <div
            ref={carousel}
            className="no-scrollbar -mx-[18px] flex snap-x snap-mandatory scroll-px-[18px] gap-3 overflow-x-auto px-[18px] pb-1"
            onScroll={(event) => {
              const element = event.currentTarget
              const stride = (element.firstElementChild as HTMLElement | null)?.offsetWidth ?? element.clientWidth
              setCardIndex(Math.round(element.scrollLeft / (stride + 12)))
            }}
          >
            {active.map((reading) => (
              <ReadingCard
                key={reading.id}
                reading={reading}
                sessions={sessions.data ?? []}
                today={today}
                onLog={() => setLogging(reading)}
              />
            ))}
          </div>
          {active.length > 1 && (
            <div className="flex h-11 items-center justify-center" aria-label="Elegir lectura">
              {active.map((reading, index) => (
                <button
                  key={reading.id}
                  className="flex h-11 min-w-11 items-center justify-center"
                  aria-label={`Ver ${reading.book.title}`}
                  aria-pressed={index === cardIndex}
                  onClick={() => {
                    const element = carousel.current?.children[index] as HTMLElement | undefined
                    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
                  }}
                >
                  <span
                    className={`h-1.5 rounded-full transition-all duration-300 [transition-timing-function:var(--spring)] ${
                      index === cardIndex ? 'w-5 bg-accent' : 'w-1.5 bg-border'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <TodayCouple>
        {partner && (
          <section
            className="card rise flex items-center gap-2.5"
            style={{ '--k': 4 } as CSSProperties}
            aria-label="Última lectura de tu pareja"
          >
            <Link
              to="/nosotros"
              aria-label={`Ver la actividad de ${partner.display_name}`}
              className="flex min-h-11 items-center"
            >
              <Avatar person={partner} size={38} />
            </Link>
            <Link to="/nosotros" className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs leading-snug">
                <strong>{partner.display_name}</strong>{' '}
                {partnerToday && latest && latestReading ? (
                  <>
                    leyó {formatUnitDelta(latestReading.unit, latest.end_pos - latest.start_pos)}{' '}
                    {formatDistanceToNowStrict(new Date(latest.created_at), { addSuffix: true, locale: es })}
                  </>
                ) : (
                  'aún no ha leído hoy'
                )}
              </p>
              {latestReading && (
                <ProgressBar
                  value={progressFraction(latestReading)}
                  color={`var(--${partner.accent})`}
                  className="h-1.5"
                />
              )}
            </Link>
            {!partnerToday && late && !nudged ? (
              <button
                className="btn min-h-9 shrink-0 px-3 text-xs"
                style={{
                  background: `color-mix(in oklab, var(--${partner.accent}) 15%, var(--surface))`,
                  color: `var(--${partner.accent})`,
                }}
                onClick={() => setNudging(true)}
              >
                <Hand size={15} /> Toque
              </button>
            ) : (
              latest && <ReactionBar targetType="session" targetId={latest.id} ownerId={partner.id} />
            )}
          </section>
        )}
      </TodayCouple>
      <section className="grid grid-cols-2 gap-3" aria-label="Resumen de lectura">
        <Link
          to="/perfil"
          className="card pressable flex items-center gap-2 py-3"
          aria-label={`${finished} de ${goal} libros en ${today.slice(0, 4)}. Editar objetivo`}
        >
          <Ring value={finished / goal} size={48} stroke={6} />
          <div className="min-w-0">
            <p className="font-serif text-2xl font-semibold leading-none">
              {finished}
              <span className="text-sm">/{goal}</span>
            </p>
            <p className="mt-1 text-[11px] leading-tight text-muted">libros en {today.slice(0, 4)}</p>
          </div>
        </Link>
        <Link
          to="/stats"
          className="card pressable space-y-2 py-3"
          aria-label={`Esta semana ${weeklyPages} páginas. Ver estadísticas`}
        >
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[10px] text-muted">Esta semana</span>
            <span className="whitespace-nowrap text-xs font-semibold">{weeklyPages} pág</span>
          </div>
          <div className="flex h-8 items-end gap-1.5" aria-hidden>
            {series.map((day) => (
              <span
                key={day.date}
                className={`flex-1 rounded-t bg-accent ${day.date > today ? 'opacity-25' : ''}`}
                style={{ height: `${Math.max(4, (day.pages / maxPages) * 100)}%` }}
              />
            ))}
          </div>
        </Link>
      </section>
      <NudgeSheet open={nudging} onClose={() => setNudging(false)} />
      {pending > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted" role="status">
          <CloudUpload size={13} aria-hidden />
          {pending} {pending === 1 ? 'sesión pendiente' : 'sesiones pendientes'} de sincronizar
        </p>
      )}
      <LogSessionSheet open={logging !== null} onClose={() => setLogging(null)} reading={logging ?? undefined} />
    </div>
  )
}

function ReadingCard({
  reading,
  sessions,
  today,
  onLog,
}: {
  reading: ReadingWithBook
  sessions: Session[]
  today: string
  onLog: () => void
}) {
  const pace = pacePerDay(reading, sessions, today)
  const finish = estimatedFinish(reading, sessions, today)
  const fraction = progressFraction(reading)
  return (
    <article className="card w-[calc(100%_-_22px)] flex-none snap-start space-y-3">
      <Link to={`/libro/${reading.id}`} className="flex gap-3">
        <Cover book={reading.book} width={58} />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="line-clamp-2 font-serif text-lg font-semibold leading-tight">{reading.book.title}</h2>
          <p className="truncate text-xs text-muted">
            {reading.book.authors.join(', ')} · {reading.format === 'audio' ? 'Audiolibro' : 'Papel'}
          </p>
          <p className="text-xs leading-snug text-muted">
            <strong className="text-ink">{Math.round(fraction * 100)} %</strong> ·{' '}
            {reading.unit === 'minutes'
              ? `te quedan ${formatMinutes(reading.total_units - reading.current_position)}`
              : finish
                ? `lo acabas hacia el ${fmt(finish, 'd MMM')}`
                : 'registra para conocer tu ritmo'}
          </p>
        </div>
      </Link>
      <div className="space-y-1.5">
        <ProgressBar value={fraction} />
        <div className="flex justify-between gap-2 text-[11px] text-muted">
          <span>{formatPosition(reading)}</span>
          <span className="shrink-0">
            {pace === null ? 'Sin ritmo aún' : `${Math.round(pace)} ${reading.unit === 'minutes' ? 'min' : 'pág'}/día`}
          </span>
        </div>
      </div>
      <div className="flex gap-2.5">
        <button className="btn btn-primary flex-[1.6]" onClick={onLog}>
          <Plus size={16} aria-hidden />
          Registrar
        </button>
        <Timer reading={reading} />
      </div>
    </article>
  )
}
