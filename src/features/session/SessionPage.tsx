import { useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { addDays } from 'date-fns'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ChevronRight, Lock, LockOpen, Pause, Play, X } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { RollingNumber } from '@/components/RollingNumber'
import { Segmented } from '@/components/Segmented'
import { Stepper } from '@/components/Stepper'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { recentReadings } from '@/features/today/recentReadings'
import { useRooms } from '@/features/us/rooms'
import { QuoteSheet } from '@/features/quotes/QuoteSheet'
import { useQuotes, useReadings, useSessions } from '@/lib/data'
import { fmt, fromISODate, todayISO, toISODate } from '@/lib/dates'
import { userMessage } from '@/lib/errors'
import { logSession } from '@/lib/offline/sessionQueue'
import { currentStreak } from '@/lib/stats/streak'
import { formatClock, spokenClock, timerMinutes } from '@/lib/timer'
import type { Quote, ReadingWithBook } from '@/lib/types'
import { formatDays, formatMinutes, formatPosition, formatUnitDelta, formatUnitValue, physicalPagePosition, progressFraction } from '@/lib/units'
import { FinishSheet } from './FinishSheet'
import { SessionStamp } from './SessionStamp'
import { JointPanel } from '@/features/together/JointPanel'
import { joinReading } from '@/features/together/live'
import { Avatar } from '@/components/Avatar'
import { TicketPanel } from '@/features/together/TicketPanel'
import {
  discardTimer,
  pauseTimer,
  resumeTimer,
  setTimerDraft,
  startTimer,
  stopTimer,
  transferTimer,
  useActiveTimer,
  useElapsedSeconds,
} from './Timer'
import { useOnline } from './useOnline'

type Mode = 'crono' | 'paginas'
type DateChoice = 'today' | 'yesterday' | 'other'
type Saved = {
  reading: ReadingWithBook
  date: string
  delta: number
  minutes: number | null
  streak: number
  unlocking: Quote[]
  togetherId: string | null
}

const MODE_KEY = 'gb.session.mode'
const LIVE_MS = 2 * 60 * 60 * 1000

function storedMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'paginas' ? 'paginas' : 'crono'
  } catch {
    return 'crono'
  }
}

function useClose() {
  const navigate = useNavigate()
  return () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/')
  }
}

/** «Leer»: a focus screen to time a reading (Cronómetro) or note pages read earlier (Solo páginas). */
export function SessionPage() {
  const { readingId } = useParams()
  const { userId } = useMe()
  const readings = useReadings(userId)
  const sessions = useSessions(userId)
  const timer = useActiveTimer()
  const close = useClose()
  const ordered = recentReadings(readings.data ?? [], sessions.data ?? [])
  const choices = [...ordered.filter((r) => r.status === 'reading'), ...ordered.filter((r) => r.status === 'want')]
  const reading =
    choices.find((r) => r.id === readingId) ?? choices.find((r) => r.id === timer?.readingId) ?? choices[0]

  if (readings.isPending) return <div role="status" aria-label="Preparando la sesión" className="h-72 animate-pulse" />
  if (!reading)
    return (
      <div className="space-y-6">
        <CloseButton onClick={close} />
        {readings.isError && !readings.data ? (
          <p className="text-sm text-danger">No se pudieron cargar tus libros. Inténtalo al volver a conectarte.</p>
        ) : (
          <EmptyState title="¿Qué vas a leer?">
            <p>Añade un libro a tu biblioteca para empezar una sesión.</p>
            <Link className="btn btn-primary mt-3" to="/biblioteca/buscar">
              Buscar un libro
            </Link>
          </EmptyState>
        )}
      </div>
    )
  return <SessionScreen key={reading.id} reading={reading} choices={choices} />
}

function CloseButton({ onClick, label = 'Cerrar' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} onClick={onClick}>
      <X size={20} aria-hidden />
    </button>
  )
}

function SessionScreen({ reading, choices }: { reading: ReadingWithBook; choices: ReadingWithBook[] }) {
  const { userId, partner } = useMe()
  const navigate = useNavigate()
  const close = useClose()
  const [params] = useSearchParams()
  const online = useOnline()
  const sessions = useSessions(userId).data ?? []
  const quotes = useQuotes().data ?? []
  const room = useRooms().find((item) => item.book.id === reading.book_id)
  const timer = useActiveTimer()
  const mine = timer?.readingId === reading.id ? timer : null
  const paused = mine?.pausedAt != null
  const seconds = useElapsedSeconds(mine)
  const today = todayISO()
  const yesterday = toISODate(addDays(fromISODate(today), -1))
  const askedDay = params.get('dia')
  const initialDate = askedDay && /^\d{4}-\d{2}-\d{2}$/.test(askedDay) && askedDay <= today ? askedDay : today
  const [mode, setModeState] = useState<Mode>(() =>
    initialDate !== today || params.get('modo') === 'paginas'
      ? 'paginas'
      : params.get('modo') === 'crono'
        ? 'crono'
        : storedMode(),
  )
  const timing = !!mine || mode === 'crono'
  const pagesUnit = reading.unit === 'pages'
  const [position, setPosition] = useState<number | null>(() =>
    mine?.draft != null && mine.draft > reading.current_position && mine.draft <= reading.total_units
      ? mine.draft
      : null,
  )
  const end = position ?? reading.current_position
  const delta = end - reading.current_position
  const [minutes, setMinutes] = useState<number | null>(null)
  const [date, setDate] = useState(initialDate)
  const [dateChoice, setDateChoice] = useState<DateChoice>(
    initialDate === today ? 'today' : initialDate === yesterday ? 'yesterday' : 'other',
  )
  const [error, setError] = useState<{ field: 'position' | 'date'; message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [finished, setFinished] = useState<ReadingWithBook | null>(null)
  const [tracing, setTracing] = useState(false)

  const name = partner?.display_name ?? 'Tu pareja'
  const theirs = room?.theirs
  const since = partner?.reading_now_since ? new Date(partner.reading_now_since).getTime() : 0
  const partnerLive = !!since && Date.now() - since >= 0 && Date.now() - since < LIVE_MS
  const partnerHere = partnerLive && !!theirs && partner?.reading_now_id === theirs.id
  const partnerLine = !partner
    ? null
    : partnerHere
      ? `${name} también está leyendo este libro ahora`
      : partnerLive
        ? `${name} está leyendo ahora`
        : theirs
          ? `${name} va por ${formatPosition(theirs)}`
          : null
  const caughtUp =
    !!theirs &&
    progressFraction(reading) < progressFraction(theirs) &&
    progressFraction({ ...reading, current_position: end }) >= progressFraction(theirs)
  const currentPage = physicalPagePosition(reading)
  const endPage = physicalPagePosition({ ...reading, current_position: end })
  // Partner quotes still ahead of the saved position: this session is what can open them.
  const waiting = currentPage !== null
    ? quotes
        .filter(
          (m) =>
            m.user_id !== userId &&
            m.book_id === reading.book_id &&
            m.locked &&
            m.page !== null &&
            m.page > currentPage,
        )
        .sort((a, b) => (a.page ?? 0) - (b.page ?? 0))
    : []
  const unlocking = waiting.filter((m) => endPage !== null && (m.page ?? 0) <= endPage)
  const nextLocked = waiting.find((m) => endPage === null || (m.page ?? 0) > endPage)
  const quoteRemaining = nextLocked
    ? pagesUnit
      ? `te faltan ${(nextLocked.page ?? 0) - (endPage ?? 0)} páginas`
      : `te falta un ${Math.max(0, Math.ceil(((nextLocked.page ?? 0) * reading.total_units) / (reading.book.page_count ?? 1)) - end)} %`
    : ''
  const other = timer && !mine ? choices.find((choice) => choice.id === timer.readingId) : undefined
  const pct = (value: number) => (reading.total_units > 0 ? Math.round((value / reading.total_units) * 100) : 0)
  const readDates = new Set(sessions.map((session) => session.read_on))
  const readToday = readDates.has(today)
  const streak = currentStreak(readDates, today)
  const dirty = !saved && !mine && (position !== null || minutes !== null || date !== initialDate)

  function setMode(value: Mode) {
    setModeState(value)
    setError(null)
    try {
      localStorage.setItem(MODE_KEY, value)
    } catch {
      /* Remembering the last mode is a convenience. */
    }
  }
  function change(value: number) {
    setPosition(value)
    setError(null)
    if (mine) setTimerDraft(reading.id, value)
  }
  function fail(field: 'position' | 'date', message: string) {
    setError({ field, message })
    requestAnimationFrame(() =>
      document.getElementById(field === 'position' ? 'session-position' : 'session-date')?.focus(),
    )
  }
  function leave() {
    if (dirty && !window.confirm('¿Salir sin guardar la sesión?')) return
    close()
  }
  function pick(choice: ReadingWithBook) {
    setPicker(false)
    if (mine) {
      transferTimer(choice.id)
      toast('El cronómetro sigue, ahora con este libro', choice.book.title)
    }
    navigate(`/leer/${choice.id}${!mine && mode === 'paginas' ? '?modo=paginas' : ''}`, { replace: true })
  }

  async function save() {
    if (busy || saved) return
    const timed = !!mine
    const readOn = timed ? today : date
    const sessionMinutes = mine ? timerMinutes(mine, Date.now()) : minutes
    if (!Number.isInteger(end) || end <= reading.current_position)
      return fail('position', pagesUnit ? 'Indica hasta qué página has llegado' : 'Indica a qué porcentaje has llegado')
    if (end > reading.total_units)
      return fail('position', `Este libro tiene ${formatUnitValue(reading.unit, reading.total_units)}`)
    if (!readOn || readOn > today) return fail('date', 'Elige una fecha que no sea futura')
    setBusy(true)
    setError(null)
    try {
      const togetherId = timed ? (mine?.togetherId ?? null) : null
      await logSession({
        reading, readOn, endPos: end, minutes: sessionMinutes, togetherId,
        startedAt: timed && mine ? new Date(mine.startedAt).toISOString() : undefined,
      })
      if (timed) stopTimer()
      const dates = new Set(sessions.map((session) => session.read_on))
      dates.add(readOn)
      setSaved({
        reading: { ...reading, current_position: end },
        date: readOn,
        delta,
        minutes: sessionMinutes,
        streak: currentStreak(dates, today),
        unlocking,
        togetherId,
      })
      navigator.vibrate?.(12)
      if (end === reading.total_units) setFinished({ ...reading, current_position: end })
    } catch (cause) {
      toast('No se pudo registrar la sesión', cause instanceof TypeError
        ? 'Sin conexión. Vuelve a intentarlo cuando tengas red'
        : userMessage(cause, 'Revisa la posición e inténtalo de nuevo'))
    } finally {
      setBusy(false)
    }
  }

  const steps = pagesUnit ? [5, 10, 25] : [1, 5, 10]
  const actions: ReactNode = saved ? (
    <>
      {online && (
        <button type="button" className="btn btn-outline min-h-[52px] flex-1" onClick={() => setTracing(true)}>
          Guardar una cita
        </button>
      )}
      <button type="button" className="btn btn-primary min-h-[52px] flex-1 text-[15px]" onClick={leave}>
        Listo
      </button>
    </>
  ) : timing && !mine ? (
    <button
      type="button"
      className="btn btn-primary min-h-[52px] w-full text-[15px]"
      onClick={() => {
        if (startTimer(reading)) setMode('crono')
      }}
    >
      <Play size={17} fill="currentColor" aria-hidden />
      Empezar a leer
    </button>
  ) : (
    <>
      {mine && (
        <button
          type="button"
          className="btn btn-outline min-h-[52px] flex-1"
          onClick={paused ? resumeTimer : pauseTimer}
        >
          {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
          {paused ? 'Seguir' : 'Pausar'}
        </button>
      )}
      <button
        type="button"
        className="btn btn-primary min-h-[52px] flex-[1.4] text-[15px]"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void save()}
      >
        {busy ? 'Guardando…' : 'Guardar sesión'}
      </button>
    </>
  )

  return (
    <div className="pb-6">
      <header className="flex items-center justify-between gap-3">
        <CloseButton onClick={leave} label={mine ? 'Cerrar; el cronómetro sigue en marcha' : 'Cerrar'} />
        <p className="eyebrow">
          {saved ? 'Sesión guardada' : mine ? (paused ? 'En pausa' : 'Leyendo') : timing ? 'Cronómetro' : 'Apuntar'}
        </p>
        <span className="w-11" aria-hidden />
      </header>

      {saved ? (
        <SavedPanel saved={saved} partnerName={name} />
      ) : (
        <>
          {mine?.togetherId && <JointPanel togetherId={mine.togetherId} reading={reading} myPage={end} />}
          <section className="mt-6 flex items-start gap-4" aria-label="Libro de esta sesión">
            <Cover book={reading.book} width={64} priority />
            <div className="min-w-0 flex-1">
              <h1 className="title line-clamp-2 [overflow-wrap:anywhere]">{reading.book.title}</h1>
              <p className="mt-1 truncate text-xs text-muted">{reading.book.authors.join(', ')}</p>
              <DraftBar
                from={reading.current_position}
                to={end}
                total={reading.total_units}
                partnerAt={theirs ? progressFraction(theirs) * reading.total_units : null}
                partnerAccent={partner?.accent}
              />
              <p className="mt-2 text-xs text-muted">
                {formatUnitValue(reading.unit, reading.current_position)} de{' '}
                {reading.total_units}{pagesUnit ? '' : ' %'} ·{' '}
                {pct(reading.current_position)} %
              </p>
            </div>
            {choices.length > 1 && (
              <button
                type="button"
                className="btn btn-link -mt-2.5 shrink-0 px-1 text-sm"
                aria-expanded={picker}
                onClick={() => setPicker(!picker)}
              >
                Cambiar
              </button>
            )}
          </section>

          {picker && (
            <ul className="rule mt-4 max-h-56 overflow-y-auto pt-1" aria-label="Elegir otro libro">
              {choices
                .filter((choice) => choice.id !== reading.id)
                .map((choice, index) => (
                  <li key={choice.id} className="enter" style={{ '--i': index } as CSSProperties}>
                    <button
                      type="button"
                      className="flex min-h-12 w-full items-center gap-3 py-1.5 text-left"
                      onClick={() => pick(choice)}
                    >
                      <Cover book={choice.book} width={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-lg leading-tight">{choice.book.title}</span>
                        <span className="text-xs text-muted">
                          {choice.status === 'reading'
                            ? `${formatUnitValue(choice.unit, choice.current_position)} · ${Math.round(
                                (choice.current_position / Math.max(1, choice.total_units)) * 100,
                              )} %`
                            : 'Pendiente'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}

          {partnerLine && (
            <p className="mt-4 flex items-center gap-2 text-xs text-muted">
              <span
                className={partnerLive ? 'live-dot' : 'inline-block h-[7px] w-[7px] rounded-full bg-current'}
                style={{ color: `var(--${partner?.accent ?? 'blue'})` }}
                aria-hidden
              />
              {partnerLine}
            </p>
          )}
          {partnerLive && !mine && !timer && (
            <button
              type="button"
              className="card card-lamp mt-4 flex min-h-14 w-full items-center gap-3 py-3 text-left"
              onClick={() => {
                void joinReading()
                  .then((row) => {
                    if (startTimer(reading, row.id)) setMode('crono')
                  })
                  .catch(() => toast('No se pudo unir a su lectura', 'Inténtalo de nuevo con conexión.'))
              }}
            >
              {partner && <Avatar person={partner} size={36} live />}
              <span className="flex-1 text-sm">
                <b className="font-extrabold">{name}</b> está leyendo. Leed a la vez: os veréis la página y os podréis
                mandar latidos.
              </span>
              <span className="btn btn-primary min-h-10 px-3.5 text-sm" aria-hidden>
                Unirme
              </span>
            </button>
          )}

          {!mine && (
            <Segmented<Mode>
              className="mt-5"
              variant="underline"
              options={[
                { value: 'crono', label: 'Cronómetro' },
                { value: 'paginas', label: pagesUnit ? 'Solo páginas' : 'Solo porcentaje' },
              ]}
              value={mode}
              onChange={setMode}
              aria-label="Cómo quieres registrar"
            />
          )}

          {timing && (
            <section className="py-7 text-center" aria-label="Cronómetro">
              <p
                role="timer"
                aria-label={spokenClock(seconds)}
                className={`timer-digits flex justify-center transition-colors duration-300 ${seconds >= 3600 ? 'text-[60px]' : 'text-[78px]'} ${mine && !paused ? 'text-ink' : 'text-muted'}`}
              >
                <RollingNumber value={seconds} format={formatClock} />
              </p>
              <p className="mt-4 flex min-h-5 items-center justify-center gap-2 text-sm text-muted" aria-live="polite">
                {mine ? (
                  paused ? (
                    'En pausa · el tiempo no corre'
                  ) : (
                    <>
                      <span className="live-dot text-accent" aria-hidden />
                      En marcha desde las {fmt(new Date(mine.startedAt), 'HH:mm')}
                    </>
                  )
                ) : (
                  'El tiempo se guarda solo al terminar'
                )}
              </p>
              {!mine && !timer && (
                <p className="mt-6 text-sm text-muted">
                  {readToday
                    ? `Hoy ya has leído · racha de ${formatDays(streak)}`
                    : streak > 0
                      ? `Racha de ${formatDays(streak)} · un ratito hoy y sigue`
                      : 'Un ratito hoy y empieza tu racha'}
                </p>
              )}
              {!mine && !timer && nextLocked && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted">
                  <Lock size={14} aria-hidden />
                  {name} te dejó algo en la p. {nextLocked.page} · {quoteRemaining}
                </p>
              )}
              {mine &&
                (confirmDiscard ? (
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 text-sm">
                    <span>¿Descartar {formatMinutes(timerMinutes(mine, Date.now()))} sin guardar?</span>
                    <button
                      type="button"
                      className="btn btn-link px-1 text-danger"
                      onClick={() => {
                        discardTimer()
                        setConfirmDiscard(false)
                        setPosition(null)
                      }}
                    >
                      Descartar
                    </button>
                    <button type="button" className="btn btn-link px-1" onClick={() => setConfirmDiscard(false)}>
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-link mt-1 px-1 text-xs text-muted"
                    onClick={() => setConfirmDiscard(true)}
                  >
                    Descartar el tiempo
                  </button>
                ))}
              {timer && !mine && (
                <div className="rule mt-6 flex flex-wrap items-center justify-center gap-x-3 pt-4 text-sm">
                  <span className="live-dot text-accent" aria-hidden />
                  <span>El cronómetro sigue con «{other?.book.title ?? 'otro libro'}»</span>
                  <Link className="btn btn-link px-1" to={`/leer/${timer.readingId}`} replace>
                    Ir
                  </Link>
                  <button type="button" className="btn btn-link px-1" onClick={() => transferTimer(reading.id)}>
                    Pasarlo a este libro
                  </button>
                </div>
              )}
            </section>
          )}

          {(!timing || mine) && (
            <section
              className={`space-y-4 ${timing ? 'rule pt-5' : 'pt-6'}`}
              aria-label={pagesUnit ? 'Hasta qué página has llegado' : 'Hasta qué porcentaje has llegado'}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="eyebrow">{pagesUnit ? 'He llegado a' : 'He llegado al porcentaje'}</h2>
                <p className="text-xs text-muted">
                  Empezaste en {formatUnitValue(reading.unit, reading.current_position)}
                </p>
              </div>
              <Stepper
                size="lg"
                value={end}
                onChange={change}
                step={1}
                min={Math.min(reading.total_units, reading.current_position + 1)}
                max={reading.total_units}
                display={
                  <span className="inline-flex items-baseline">
                    {pagesUnit && <span className="mr-1.5 text-[0.55em] text-muted">p.</span>}
                    <RollingNumber value={end} />
                    {!pagesUnit && <span className="ml-1.5 text-[0.55em] text-muted">%</span>}
                  </span>
                }
                caption={
                  <span className={delta > 0 ? 'text-accent' : undefined}>
                    +{formatUnitDelta(reading.unit, delta)} · {pct(end)} %
                  </span>
                }
                label={pagesUnit ? 'Página alcanzada' : 'Porcentaje alcanzado'}
                editable
                inputId="session-position"
                invalid={error?.field === 'position'}
                describedBy={error?.field === 'position' ? 'session-position-error' : undefined}
                editLabel={pagesUnit ? 'Escribir la página' : 'Escribir el porcentaje'}
                inputMode="numeric"
              />
              {error?.field === 'position' && (
                <p id="session-position-error" role="alert" className="text-center text-sm text-danger">
                  {error.message}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-1.5">
                {steps.map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    className="chip px-3"
                    disabled={end >= reading.total_units}
                    onClick={() => change(Math.min(reading.total_units, end + amount))}
                  >
                    +{amount}
                    {pagesUnit ? '' : ' %'}
                  </button>
                ))}
                <button
                  type="button"
                  className="chip px-3"
                  disabled={end >= reading.total_units}
                  onClick={() => change(reading.total_units)}
                >
                  Lo terminé
                </button>
              </div>
              {(unlocking.length > 0 || nextLocked || caughtUp) && (
                <div className="space-y-2 text-center text-sm">
                  {caughtUp && (
                    <p className="text-accent" style={{ animation: 'gb-pop-in 360ms var(--ease) both' }}>
                      Alcanzas a {name}
                    </p>
                  )}
                  {unlocking.length > 0 ? (
                    <p
                      key={unlocking.length}
                      className="flex items-center justify-center gap-1.5 text-accent"
                      style={{ animation: 'gb-pop-in 360ms var(--ease) both' }}
                    >
                      <LockOpen size={15} aria-hidden />
                      Al guardar se abrirá {unlocking.length === 1
                        ? 'lo que te dejó'
                        : `${unlocking.length} citas de`}{' '}
                      {name}
                    </p>
                  ) : (
                    nextLocked && (
                      <p className="flex items-center justify-center gap-1.5 text-muted">
                        <Lock size={14} aria-hidden />
                        {name} te dejó algo en la p. {nextLocked.page} · {quoteRemaining}
                      </p>
                    )
                  )}
                </div>
              )}
            </section>
          )}

          {!timing && (
            <>
              <section className="rule mt-6 space-y-3 pt-5" aria-label="Tiempo leyendo">
                <h2 className="eyebrow">¿Cuánto rato? · opcional</h2>
                <div className="flex flex-wrap gap-1.5">
                  {[null, 15, 30, 45, 60].map((value) => (
                    <button
                      type="button"
                      key={value ?? 'none'}
                      className="chip px-3"
                      aria-pressed={minutes === value}
                      aria-label={value === null ? 'Sin tiempo' : undefined}
                      onClick={() => setMinutes(value)}
                    >
                      {value === null ? '—' : value === 60 ? '1 h' : `${value} min`}
                    </button>
                  ))}
                </div>
              </section>
              <section className="rule mt-6 space-y-3 pt-5" aria-label="Fecha de lectura">
                <h2 className="eyebrow">Cuándo</h2>
                <Segmented<DateChoice>
                  options={[
                    { value: 'today', label: 'Hoy' },
                    { value: 'yesterday', label: 'Ayer' },
                    { value: 'other', label: 'Otro día' },
                  ]}
                  value={dateChoice}
                  onChange={(choice) => {
                    setDateChoice(choice)
                    setError(null)
                    if (choice !== 'other') setDate(choice === 'today' ? today : yesterday)
                  }}
                  aria-label="Cuándo has leído"
                />
                {dateChoice === 'other' && (
                  <input
                    className="input"
                    id="session-date"
                    name="read-on"
                    type="date"
                    max={today}
                    value={date}
                    autoComplete="off"
                    aria-label="Fecha de la sesión"
                    aria-invalid={error?.field === 'date'}
                    onChange={(event) => setDate(event.target.value)}
                  />
                )}
                {error?.field === 'date' && (
                  <p role="alert" className="text-sm text-danger">
                    {error.message}
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}

      {createPortal(
        <div
          className="night fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-xl gap-2 border-t border-rule px-5 pt-3"
          style={{
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            animation: 'gb-sheet-up 420ms var(--ease) both',
          }}
        >
          {actions}
        </div>,
        document.body,
      )}

      <QuoteSheet
        open={tracing}
        onClose={() => setTracing(false)}
        bookId={reading.book_id}
        page={saved && saved.reading.unit === 'pages' ? saved.reading.current_position : null}
      />
      {finished && <FinishSheet reading={finished} readOn={saved?.date ?? today} onClose={() => setFinished(null)} />}
    </div>
  )
}

/** Track with the saved progress, this session's pages in a lighter ink and the partner's mark. */
function DraftBar({
  from,
  to,
  total,
  partnerAt,
  partnerAccent,
}: {
  from: number
  to: number
  total: number
  partnerAt: number | null
  partnerAccent?: string
}) {
  const pct = (value: number) => (total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0)
  return (
    <div
      className="relative mt-3 h-[3px] bg-rule"
      role="progressbar"
      aria-label="Progreso con esta sesión"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct(to))}
    >
      <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${pct(from)}%` }} />
      <div
        className="absolute inset-y-0 bg-accent"
        style={{
          left: `${pct(from)}%`,
          width: `${pct(to) - pct(from)}%`,
          opacity: 0.45,
          transition: 'width var(--dur-move) var(--ease)',
        }}
      />
      {partnerAt !== null && partnerAccent && (
        <span
          className="absolute -top-1 h-[11px] w-px"
          style={{ left: `${pct(partnerAt)}%`, background: `var(--${partnerAccent})` }}
          aria-hidden
        />
      )}
    </div>
  )
}

function SavedPanel({ saved, partnerName }: { saved: Saved; partnerName: string }) {
  const { reading } = saved
  const detail = [`+${formatUnitDelta(reading.unit, saved.delta)}`, saved.minutes ? formatMinutes(saved.minutes) : null]
    .filter(Boolean)
    .join(' · ')
  const progress = reading.total_units > 0 ? Math.round((reading.current_position / reading.total_units) * 100) : 0
  // Pace only means something with real time behind it (Bookly-style pages per hour).
  const pace =
    reading.unit === 'pages' && saved.minutes && saved.minutes >= 5 && saved.delta > 0
      ? Math.round((saved.delta / saved.minutes) * 60)
      : null
  const first = saved.unlocking[0]
  return (
    <div className="pt-4">
      {saved.togetherId ? (
        <TicketPanel togetherId={saved.togetherId} reading={reading} delta={saved.delta} minutes={saved.minutes} />
      ) : (
        <section role="status" className="flex flex-col items-center text-center">
          <SessionStamp date={saved.date} detail={detail} />
          <h1 className="display enter mt-5" style={{ '--i': 4 } as CSSProperties}>
            Sesión <span className="display-italic">guardada</span>
          </h1>
          <p className="folio enter mt-3" style={{ '--i': 5 } as CSSProperties}>
            {detail}
          </p>
          <p className="enter mt-1 text-sm text-muted" style={{ '--i': 6 } as CSSProperties}>
            {saved.streak > 1 ? `Racha de ${formatDays(saved.streak)}` : 'Hoy empieza una racha'} · {progress} % del
            libro
            {pace !== null && ` · ${pace} págs/hora`}
          </p>
        </section>
      )}
      {first && (
        <Link
          to={`/citas#c-${first.id}`}
          className="rule mt-7 flex min-h-12 items-center gap-3 pt-4 text-left text-sm"
          style={{ animation: 'gb-pop-in 420ms var(--ease) 700ms both' }}
        >
          <LockOpen size={18} className="shrink-0 text-accent" aria-hidden />
          <span className="flex-1">
            Se ha abierto lo que te dejó {partnerName} en la p. {first.page}
            {saved.unlocking.length > 1 ? ` y ${saved.unlocking.length - 1} más` : ''}
          </span>
          <ChevronRight size={18} className="shrink-0" aria-hidden />
        </Link>
      )}
    </div>
  )
}
