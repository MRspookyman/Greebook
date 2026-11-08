import { useEffect, useState, type CSSProperties } from 'react'
import { BookOpen, ChevronRight, CloudUpload, Heart, Lamp, Play, Plus, Quote as QuoteIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useMe } from '@/features/auth/me'
import { useQuotes, useReadings, useSessions } from '@/lib/data'
import { fmt, greeting, todayISO } from '@/lib/dates'
import { sharedStreak } from '@/lib/stats/streak'
import { dailySeries, estimatedFinish, weekDays } from '@/lib/stats/insights'
import { formatDays, formatPosition, progressFraction } from '@/lib/units'
import type { ReadingWithBook, Session } from '@/lib/types'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'
import { isPartnerReading } from '@/lib/presence'
import { Avatar } from '@/components/Avatar'
import { Cover } from '@/components/Cover'
import { ProgressBar } from '@/components/ProgressBar'
import { EmptyState } from '@/components/EmptyState'
import { startTimer, useActiveTimer, useElapsedSeconds } from '@/features/session/Timer'
import { formatClock } from '@/lib/timer'
import { usePendingForMe } from '@/features/us/messages'
import { useRooms } from '@/features/us/rooms'
import { QuoteCard } from '@/features/quotes/QuoteCard'
import { QuoteSheet } from '@/features/quotes/QuoteSheet'
import { recentReadings } from './recentReadings'
import { joinReading } from '@/features/together/live'
import { toast } from '@/components/toast'
import { WeekStamps } from './WeekStamps'

/** Minutes since a timestamp, refreshed every half minute while shown. */
function useMinutesSince(iso: string | null | undefined): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!iso) return
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [iso])
  return iso ? Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000)) : 0
}

/** Inicio: what is happening between the two of you right now, your book, and your week together. */
export function TodayPage() {
  const { userId, profile, partner } = useMe()
  const readings = useReadings(userId)
  const sessions = useSessions(userId)
  const partnerReadings = useReadings(partner?.id)
  const partnerSessions = useSessions(partner?.id)
  const quotes = useQuotes(!!partner).data ?? []
  const rooms = useRooms()
  const pending = usePendingSessionCount()
  const forMe = usePendingForMe()
  const navigate = useNavigate()
  const [quoting, setQuoting] = useState<ReadingWithBook | null>(null)
  const read = (reading: ReadingWithBook) => {
    if (startTimer(reading)) navigate(`/leer/${reading.id}`)
  }
  const today = todayISO()
  const dateLabel = fmt(today, "EEEE, d 'de' MMMM")
  const active = recentReadings(
    (readings.data ?? []).filter((r) => r.status === 'reading'),
    sessions.data ?? [],
  )
  const main = active[0]
  const others = active.slice(1)
  const mine = new Set(sessions.data?.map((s) => s.read_on) ?? [])
  const theirs = new Set(partnerSessions.data?.map((s) => s.read_on) ?? [])
  const streak = sharedStreak(mine, theirs, today)
  const finished = (readings.data ?? []).filter(
    (r) => r.status === 'finished' && r.finished_on?.startsWith(today.slice(0, 4)),
  ).length
  const week = weekDays(today)
  const weeklyPages = dailySeries(sessions.data ?? [], readings.data ?? [], { from: week[0], to: week[6] }).reduce(
    (sum, day) => sum + day.pages,
    0,
  )
  const latest = quotes.find((q) => q.user_id === partner?.id)
  const name = partner?.display_name ?? 'tu pareja'

  const todayLine = !partner ? (
    mine.has(today) ? (
      'Hoy ya has leído.'
    ) : (
      'Un ratito hoy, cuando te apetezca.'
    )
  ) : mine.has(today) && theirs.has(today) ? (
    <>
      <Heart size={17} className="mt-0.5 flex-none text-rose" fill="currentColor" aria-hidden />
      Hoy habéis leído los dos. {formatDays(streak)} {streak === 1 ? 'seguido' : 'seguidos'}.
    </>
  ) : theirs.has(today) ? (
    <>
      <Lamp size={17} className="mt-0.5 flex-none text-amber-ink" aria-hidden />
      {name} ya ha leído hoy. Falta tu ratito para la racha de los dos.
    </>
  ) : mine.has(today) ? (
    <>
      <Lamp size={17} className="mt-0.5 flex-none text-amber-ink" aria-hidden />
      Hoy ya has leído. Falta {name} para la racha de los dos.
    </>
  ) : (
    <>
      <Lamp size={17} className="mt-0.5 flex-none text-amber-ink" aria-hidden />
      {streak > 0
        ? `Lleváis ${formatDays(streak)} leyendo los dos. Un ratito hoy y sigue.`
        : 'Un ratito hoy y empieza vuestra racha.'}
    </>
  )

  return (
    <div className="space-y-7">
      <header className="enter space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-muted">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
          <Link to="/perfil" className="-mr-1 flex min-h-11 items-center pl-2" aria-label="Perfil y ajustes">
            <Avatar person={profile} size={32} />
            {partner && (
              <span className="-ml-2 rounded-full ring-2 ring-bg">
                <Avatar person={partner} size={32} />
              </span>
            )}
          </Link>
        </div>
        <h1 className="display">
          {greeting()},
          <br />
          <span style={{ color: `var(--${profile.accent})` }}>{profile.display_name}</span>
        </h1>
        <p className="flex items-start gap-2 text-[15px] text-muted">{todayLine}</p>
      </header>

      <NowCard active={active} partnerReadings={partnerReadings.data ?? []} onRead={read} />

      {partner && forMe.count > 0 && (
        <Link
          to="/nosotros"
          className="card enter flex min-h-14 items-center gap-3 py-3"
          style={{ '--i': 1 } as CSSProperties}
        >
          <Avatar person={partner} size={30} />
          <span className="flex-1 text-sm">
            {name}{' '}
            {forMe.items[0].type === 'invite'
              ? 'te invita a un ratito'
              : forMe.items[0].type === 'together'
                ? 'quiere leer contigo'
                : 'te propone un reto para los dos'}
          </span>
          <ChevronRight size={18} aria-hidden />
        </Link>
      )}

      {readings.isPending ? (
        <div className="h-56 animate-pulse rounded-[22px] bg-sunk" role="status" aria-label="Cargando lecturas" />
      ) : readings.isError && !readings.data ? (
        <p className="text-sm text-danger">No se pudieron cargar tus libros. Inténtalo al volver a conectarte.</p>
      ) : !main ? (
        <section className="card">
          <EmptyState title="Aún no estás leyendo nada">
            <Link className="btn btn-primary mt-3" to="/biblioteca/buscar">
              Buscar un libro
            </Link>
          </EmptyState>
        </section>
      ) : (
        <section className="enter space-y-3" style={{ '--i': 2 } as CSSProperties} aria-labelledby="tu-lectura">
          <h2 id="tu-lectura">Tu lectura</h2>
          <CurrentReading
            reading={main}
            sessions={sessions.data ?? []}
            today={today}
            ribbons={
              rooms.some((room) => room.mine.id === main.id) && partner
                ? [partner.accent, profile.accent]
                : [profile.accent]
            }
            onRead={() => read(main)}
            onQuote={() => setQuoting(main)}
          />
          {others.map((reading) => {
            const room = rooms.find((item) => item.mine.id === reading.id)
            return (
              <div key={reading.id} className="flex min-h-16 items-center gap-3 py-1">
                <Link to={`/libro/${reading.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                  <Cover
                    book={reading.book}
                    width={44}
                    ribbons={room && partner ? [partner.accent, profile.accent] : undefined}
                  />
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="truncate font-extrabold">
                      {reading.book.title}
                      {room ? ' · a dúo' : ''}
                    </span>
                    {room && partner ? (
                      <>
                        <span className="grid gap-[3px]" aria-hidden>
                          <ProgressBar
                            value={progressFraction(room.theirs)}
                            color={`var(--${partner.accent})`}
                            className="h-1"
                          />
                          <ProgressBar
                            value={progressFraction(reading)}
                            color={`var(--${profile.accent})`}
                            className="h-1"
                          />
                        </span>
                        <span className="text-[13px] text-muted">
                          Tú p. {reading.current_position} · {name} p. {room.theirs.current_position}
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] text-muted">
                        {formatPosition(reading)} · {Math.round(progressFraction(reading) * 100)} %
                      </span>
                    )}
                  </span>
                </Link>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Leer «${reading.book.title}»`}
                  onClick={() => read(reading)}
                >
                  <Play size={16} fill="currentColor" aria-hidden />
                </button>
              </div>
            )
          })}
        </section>
      )}

      {partner && (
        <section className="enter space-y-3" style={{ '--i': 3 } as CSSProperties} aria-labelledby="racha">
          <div className="flex items-center justify-between gap-3">
            <h2 id="racha">Racha de los dos</h2>
            <span className="pill">
              <Lamp size={15} className="text-amber-ink" aria-hidden />
              {formatDays(streak)}
            </span>
          </div>
          <WeekStamps today={today} mine={mine} theirs={theirs} profile={profile} partner={partner} />
        </section>
      )}

      {latest && partner && (
        <section className="enter space-y-3" style={{ '--i': 4 } as CSSProperties} aria-labelledby="de-pareja">
          <div className="flex items-center justify-between gap-3">
            <h2 id="de-pareja">De {partner.display_name}</h2>
            <Link to="/citas" className="btn btn-link px-1 text-sm">
              Ver todas
            </Link>
          </div>
          <QuoteCard quote={latest} compact />
        </section>
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span>
          <b className="font-extrabold text-ink">
            {finished} de {profile.yearly_goal}
          </b>{' '}
          libros en {today.slice(0, 4)}
        </span>
        <span aria-hidden>·</span>
        <span>
          <b className="font-extrabold text-ink">{weeklyPages}</b> páginas esta semana
        </span>
      </p>
      {pending > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted" role="status">
          <CloudUpload size={13} aria-hidden />
          {pending} {pending === 1 ? 'sesión pendiente' : 'sesiones pendientes'} de sincronizar
        </p>
      )}
      {quoting && (
        <QuoteSheet
          open={!!quoting}
          onClose={() => setQuoting(null)}
          bookId={quoting.book_id}
          page={quoting.unit === 'pages' ? quoting.current_position : null}
        />
      )}
    </div>
  )
}

/** What is happening right now: your running session, or your partner reading under their lamp. */
function NowCard({
  active,
  partnerReadings,
  onRead,
}: {
  active: ReadingWithBook[]
  partnerReadings: ReadingWithBook[]
  onRead: (reading: ReadingWithBook) => void
}) {
  const { profile, partner } = useMe()
  const navigate = useNavigate()
  const [joining, setJoining] = useState(false)
  const timer = useActiveTimer()
  const seconds = useElapsedSeconds(timer)
  const live = isPartnerReading(partner)
  const liveReading = partnerReadings.find((reading) => reading.id === partner?.reading_now_id)
  const minutes = useMinutesSince(live ? partner?.reading_now_since : null)
  if (timer) {
    const reading = active.find((item) => item.id === timer.readingId)
    return (
      <section className="card card-lamp enter space-y-3.5" aria-label="Sesión en marcha">
        <div className="flex items-center gap-3.5">
          {live && partner && <Avatar person={partner} size={44} live />}
          <Avatar person={profile} size={44} live={timer.pausedAt == null} />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{timer.pausedAt == null ? 'Estás leyendo' : 'Tu sesión, en pausa'}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <span className="tabular-nums">{formatClock(seconds)}</span>
              {reading && <span className="truncate">· {reading.book.title}</span>}
            </p>
          </div>
        </div>
        <Link to={`/leer/${timer.readingId}`} className="btn btn-primary w-full">
          Volver a la sesión
        </Link>
      </section>
    )
  }
  if (!live || !partner || !liveReading) return null
  // Same book when you share it; otherwise your own current reading, side by side.
  const along = active.find((reading) => reading.book_id === liveReading.book_id) ?? active[0]
  return (
    <section className="card card-lamp enter space-y-3.5" aria-label={`${partner.display_name} está leyendo ahora`}>
      <div className="flex items-center gap-3.5">
        <Avatar person={partner} size={52} live />
        <div className="min-w-0 flex-1">
          <p>
            <b className="font-extrabold">{partner.display_name}</b> está leyendo
          </p>
          <p className="truncate font-extrabold">{liveReading.book.title}</p>
          <p className="flex items-center gap-1.5 text-[13.5px] text-muted">
            <span className="live-dot" aria-hidden />
            {formatPosition(liveReading)} · lleva {minutes} min
          </p>
        </div>
        <Cover book={liveReading.book} width={44} ribbon={partner.accent} />
      </div>
      {along && (
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={joining}
          onClick={() => {
            setJoining(true)
            void joinReading()
              .then((row) => {
                if (startTimer(along, row.id)) navigate(`/leer/${along.id}`)
              })
              .catch(() => {
                toast('No se pudo unir a su lectura', 'Empiezas tu cronómetro igualmente.')
                onRead(along)
              })
              .finally(() => setJoining(false))
          }}
        >
          <BookOpen size={17} aria-hidden />
          {joining ? 'Uniéndote…' : 'Unirme a su lectura'}
        </button>
      )}
    </section>
  )
}

function CurrentReading({
  reading,
  sessions,
  today,
  ribbons,
  onRead,
  onQuote,
}: {
  reading: ReadingWithBook
  sessions: Session[]
  today: string
  ribbons: ('blue' | 'green')[]
  onRead: () => void
  onQuote: () => void
}) {
  const finish = estimatedFinish(reading, sessions, today)
  const fraction = progressFraction(reading)
  const audio = reading.format === 'audio'
  return (
    <article className="card grid grid-cols-[auto_1fr] gap-4">
      <Link to={`/libro/${reading.id}`} aria-label={`Abrir ${reading.book.title}`}>
        <Cover book={reading.book} width={88} priority ribbons={ribbons} />
      </Link>
      <div className="flex min-w-0 flex-col gap-1">
        <Link to={`/libro/${reading.id}`}>
          <h3 className="title wrap-anywhere">{reading.book.title}</h3>
        </Link>
        <p className="truncate text-[13px] text-muted">{reading.book.authors.join(', ')}</p>
        <p className="folio mt-2">
          {reading.unit === 'pages' ? (
            <>
              p. {reading.current_position} <span className="text-[15px] text-muted">de {reading.total_units}</span>
            </>
          ) : (
            formatPosition(reading)
          )}
        </p>
        <ProgressBar value={fraction} />
        <p className="text-[13px] text-muted">
          {Math.round(fraction * 100)} %
          {finish ? ` · a tu ritmo, lo acabas hacia el ${fmt(finish, "d 'de' MMMM")}` : ''}
        </p>
      </div>
      <div className="col-span-2 grid grid-cols-[1.15fr_1fr_1fr] gap-2">
        <button type="button" className="btn btn-primary px-2.5" onClick={onRead}>
          <Play size={15} fill="currentColor" aria-hidden />
          {audio ? 'Escuchar' : 'Leer'}
        </button>
        <Link to={`/leer/${reading.id}?modo=paginas`} className="btn btn-soft px-2.5">
          <Plus size={17} aria-hidden />
          {reading.unit === 'minutes' ? 'Tiempo' : 'Página'}
        </Link>
        <button type="button" className="btn btn-soft px-2.5" onClick={onQuote}>
          <QuoteIcon size={16} aria-hidden />
          Cita
        </button>
      </div>
    </article>
  )
}
