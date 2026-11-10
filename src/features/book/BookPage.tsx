import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { liveQuery } from 'dexie'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, BookCheck, ChevronDown, Heart, MoreHorizontal, Pencil, Play, Plus } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { qk, useQuotes, useReactions, useReadings, useRecommendations, useSessions } from '@/lib/data'
import { toggleHeart } from '@/features/quotes/quotes'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { Reading, ReadingWithBook, Session } from '@/lib/types'
import { fmt, todayISO } from '@/lib/dates'
import { atLastPage, formatFinished, formatLabel, formatMinutes, formatUnitValue, percentOf, progressFraction } from '@/lib/units'
import { timeOnly } from '@/lib/sessionRules'
import { readingPace } from './readingPace'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { ProgressBar } from '@/components/ProgressBar'
import { Segmented } from '@/components/Segmented'
import { Stars } from '@/components/Stars'
import { MoodChips } from '@/components/MoodChips'
import { toast } from '@/components/toast'
import { startTimer, useActiveTimer } from '@/features/session/Timer'
import { useOnline } from '@/features/session/useOnline'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'
import { offlineDb } from '@/lib/offline/db'
import { ReadingEditor } from './ReadingEditor'
import { SessionEditor } from './SessionEditor'
import { BookTogether } from './BookTogether'
import { BookKeepsake } from '@/features/diary/BookKeepsake'
import { PartnerReadingBanner } from './PartnerReadingBanner'
import { ReadingOptionsSheet } from './ReadingOptionsSheet'
import { AbandonSheet } from './AbandonSheet'
import { BookTags } from '@/features/library/BookTags'
import { RecommendButton } from '@/features/library/RecommendButton'
import { QuoteCard } from '@/features/quotes/QuoteCard'
import { QuoteSheet } from '@/features/quotes/QuoteSheet'
import { FinishSheet } from '@/features/session/FinishSheet'
import { finishDay } from '@/features/session/finishDay'

const statuses = { want: 'Pendiente', reading: 'Leyendo', finished: 'Leído', abandoned: 'Dejado' }
type BookTab = 'sessions' | 'quotes' | 'joint'

export function BookPage() {
  const { readingId } = useParams()
  const { userId, partner } = useMe()
  const mine = useReadings(userId)
  const theirs = useReadings(partner?.id)
  const reading = mine.data?.find((r) => r.id === readingId) ?? theirs.data?.find((r) => r.id === readingId)
  return reading ? (
    <BookDetail key={reading.id} reading={reading} />
  ) : mine.isPending || (partner && theirs.isPending) ? (
    <div className="card h-64 animate-pulse" role="status" aria-label="Cargando libro" />
  ) : mine.isError || (partner && theirs.isError) ? (
    <div role="alert" className="space-y-3">
      <p>No se ha podido cargar esta lectura.</p>
      <button
        className="btn btn-secondary"
        onClick={() => {
          void mine.refetch()
          if (partner) void theirs.refetch()
        }}
      >
        Reintentar
      </button>
    </div>
  ) : (
    <p>No se ha encontrado esta lectura.</p>
  )
}

function BookDetail({ reading }: { reading: ReadingWithBook }) {
  const { userId, profile, partner } = useMe()
  const navigate = useNavigate()
  const own = reading.user_id === userId
  const sessionsQuery = useSessions(reading.user_id)
  const bookQuotes = (useQuotes().data ?? [])
    .filter((q) => q.book_id === reading.book_id)
    .sort((a, b) => (a.page ?? 0) - (b.page ?? 0))
  const [quoting, setQuoting] = useState(false)
  const reactions = useReactions().data ?? []
  // The words that came with the book when your partner recommended it: its dedication.
  const dedication = (useRecommendations().data ?? []).find(
    (row) => row.book_id === reading.book_id && row.to_user === reading.user_id && row.status !== 'dismissed' && row.message.trim(),
  )
  const giver = dedication ? (dedication.from_user === userId ? profile : partner) : null
  const sessions = (sessionsQuery.data ?? [])
    .filter((s) => s.reading_id === reading.id)
    .sort((a, b) => b.read_on.localeCompare(a.read_on) || b.created_at.localeCompare(a.created_at))
  const minutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0)
  const today = todayISO()
  const estimate = readingPace(reading, sessions, today)
  const pace = estimate?.pace ?? null
  const finish = estimate?.finish ?? null
  const remaining = Math.max(0, reading.total_units - reading.current_position)
  const online = useOnline()
  const pending = usePendingSessionCount()
  const timer = useActiveTimer()
  const timing = timer?.readingId === reading.id
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)
  const [editingReading, setEditingReading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [abandoning, setAbandoning] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [readingPending, setReadingPending] = useState<number | null>(null)
  useEffect(() => {
    const subscription = liveQuery(() =>
      offlineDb.pendingOps
        .filter((op) => op.payload.session.reading_id === reading.id && op.payload.session.user_id === userId)
        .count(),
    ).subscribe({
      next: setReadingPending,
      error: () => setReadingPending(null),
    })
    return () => subscription.unsubscribe()
  }, [reading.id, userId])
  const [tab, setTab] = useState<BookTab>('sessions')
  const [allSessions, setAllSessions] = useState(false)
  // One underline that travels to the chosen tab instead of jumping between them.
  const tablist = useRef<HTMLDivElement>(null)
  const [ink, setInk] = useState<{ left: number; width: number } | null>(null)
  const quoteCount = bookQuotes.length
  useLayoutEffect(() => {
    const measure = () => {
      const button = tablist.current?.querySelector<HTMLElement>(`#book-tab-${tab}`)
      if (button) setInk({ left: button.offsetLeft, width: button.offsetWidth })
    }
    measure()
    // Labels change width once the web font arrives.
    void document.fonts?.ready.then(measure)
  }, [tab, quoteCount])
  const disabled = !online || busy || pending > 0
  const destructiveDisabled =
    !online || busy || readingPending !== 0 || !sessionsQuery.isSuccess
  const destructiveExplanation = !online
    ? 'Sin conexión: vuelve a conectarte para reiniciar o eliminar esta lectura.'
    : readingPending === null
      ? 'Comprobando las sesiones pendientes de esta lectura…'
      : readingPending > 0
        ? 'Espera a que se sincronicen las sesiones de esta lectura para reiniciarla o eliminarla.'
        : !sessionsQuery.isSuccess
          ? 'Espera a que se carguen las sesiones antes de reiniciar o eliminar la lectura.'
          : null
  const tabs: { value: BookTab; label: string }[] = [
    { value: 'sessions', label: 'Sesiones' },
    { value: 'quotes', label: `Citas · ${bookQuotes.length}` },
    { value: 'joint', label: 'Juntos' },
  ]
  async function patch(values: Partial<Reading>) {
    if (!own || disabled) return false
    setBusy(true)
    try {
      const { error } = await supabase.from('readings').update(values).eq('id', reading.id).eq('user_id', userId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: qk.readings(userId) })
      return true
    } catch {
      toast('No se pudo actualizar la lectura')
      return false
    } finally {
      setBusy(false)
    }
  }
  async function reread() {
    if (!own || disabled) return
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('readings')
        .insert({
          user_id: userId,
          book_id: reading.book_id,
          format: reading.format,
          unit: reading.unit,
          total_units: reading.total_units,
          status: 'reading',
          started_on: today,
        })
        .select('id')
        .single()
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: qk.readings(userId) })
      navigate(`/libro/${data.id}`)
    } catch {
      toast('No se pudo crear la nueva lectura')
    } finally {
      setBusy(false)
    }
  }
  async function destroyReading(remove: boolean) {
    if (!own || destructiveDisabled) return
    const message = remove
      ? `Se borrarán ${sessions.length} sesiones y las notas antiguas de esta lectura. Las citas compartidas se conservan.`
      : `Se borrarán ${sessions.length} sesiones. Tus citas y valoración se conservan.`
    if (!window.confirm(`${remove ? '¿Eliminar de la biblioteca?' : '¿Reiniciar lectura?'}\n\n${message}`)) return
    setBusy(true)
    try {
      // Check durable operations again: a session may have been queued while the menu was open.
      const queued = await offlineDb.pendingOps
        .filter((op) => op.payload.session.reading_id === reading.id && op.payload.session.user_id === userId)
        .count()
      if (queued > 0) {
        toast('Espera a que se sincronicen las sesiones de esta lectura')
        return
      }
      if (remove) {
        const { error } = await supabase.from('readings').delete().eq('id', reading.id).eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('readings').update({
          status: 'want',
          current_position: 0,
          started_on: null,
          finished_on: null,
          finished_precision: null,
          backfilled: false,
        }).eq('id', reading.id).eq('user_id', userId)
        if (error) throw error
        // Preserve sessions if resetting the reading fails; refresh both if deletion fails.
        const { error: sessionsError } = await supabase
          .from('sessions').delete().eq('reading_id', reading.id).eq('user_id', userId)
        if (sessionsError) throw sessionsError
      }
      setMenuOpen(false)
      if (remove) navigate('/biblioteca')
      toast(remove ? 'Eliminado de la biblioteca' : 'Lectura reiniciada')
    } catch {
      toast(remove ? 'No se pudo eliminar la lectura' : 'No se pudo reiniciar la lectura')
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.readings(userId) }),
        queryClient.invalidateQueries({ queryKey: qk.sessions(userId) }),
        queryClient.invalidateQueries({ queryKey: qk.reactions() }),
      ])
      setBusy(false)
    }
  }
  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-center gap-2">
        <button
          className="icon-btn"
          aria-label="Volver"
          onClick={() => {
            if (window.history.state?.idx > 0) navigate(-1)
            else navigate('/biblioteca')
          }}
        >
          <ArrowLeft size={20} />
        </button>
        {own && (
          <button
            className="icon-btn ml-auto"
            aria-label="Opciones de la lectura"
            onClick={() => setMenuOpen(true)}
          >
            <MoreHorizontal size={20} />
          </button>
        )}
      </div>
      {!own && partner && <PartnerReadingBanner reading={reading} />}
      <header className="enter flex items-start gap-5">
        <Cover
          book={reading.book}
          width={90}
          ribbon={reading.status === 'reading' ? (own ? profile.accent : partner?.accent) : undefined}
        />
        <div className="min-w-0">
          <h1 className="display text-[30px] [overflow-wrap:anywhere]">{reading.book.title}</h1>
          <p className="mt-2 text-xs text-muted [overflow-wrap:anywhere]">
            {reading.book.authors.join(', ')}
            {reading.book.published_year ? ` · ${reading.book.published_year}` : ''}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatLabel(reading.format)}
            {reading.unit === 'pages' ? ` · ${reading.total_units} págs.` : ''}
            {' · '}
            {reading.finished_on && reading.status === 'finished'
              ? `terminado ${reading.finished_precision === 'month' || reading.finished_precision === 'year' ? 'en' : 'el'} ${formatFinished(reading.finished_on, reading.finished_precision)}`
              : reading.started_on
                ? `empezado el ${fmt(reading.started_on, 'd MMM')}`
                : 'aún por empezar'}
          </p>
        </div>
      </header>
      {dedication && giver && (
        <figure className="rounded-[18px] bg-[color-mix(in_oklab,var(--amber)_9%,var(--surface))] px-4 py-3">
          <blockquote className="hand wrap-anywhere" style={{ color: `var(--${giver.accent})` }}>
            {dedication.message}
          </blockquote>
          <figcaption className="mt-1 text-xs text-muted">
            {dedication.from_user === userId ? `Se lo recomendaste a ${partner?.display_name ?? 'tu pareja'}` : `Te lo recomendó ${giver.display_name}`}
          </figcaption>
        </figure>
      )}
      {own ? (
        <button
          type="button"
          className="chip"
          aria-haspopup="dialog"
          disabled={disabled || (reading.status === 'finished' && !sessionsQuery.isSuccess)}
          onClick={() => setStatusOpen(true)}
        >
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          {statuses[reading.status]}
          <ChevronDown size={16} aria-hidden />
          <span className="sr-only">Cambiar el estado de la lectura</span>
        </button>
      ) : (
        <p className="text-sm text-muted">{statuses[reading.status]}</p>
      )}
      {reading.status === 'abandoned' && reading.abandon_reason && (
        <p className="text-sm text-muted">{reading.abandon_reason}</p>
      )}
      <div
        className={reading.status === 'finished' ? 'grid' : 'hidden !my-0'}
        style={{ gridTemplateRows: reading.status === 'finished' ? '1fr' : '0fr' }}
        aria-hidden={reading.status !== 'finished'}
        inert={reading.status !== 'finished'}
      >
        <div className="overflow-hidden">
          <div className="space-y-2">
            <Stars
              value={reading.rating ?? 0}
              onChange={own && !disabled ? (rating) => void patch({ rating }) : undefined}
            />
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <MoodChips
                  value={reading.moods}
                  onChange={own && !disabled ? (moods) => void patch({ moods }) : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {reading.status === 'finished' ? (
        <BookKeepsake reading={reading} />
      ) : (
        <section className="space-y-4" aria-label="Progreso de lectura">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="folio text-[38px] leading-none text-accent">
              {percentOf(reading)} <span className="text-2xl">%</span>
            </p>
            {reading.unit === 'pages' && (
              <p className="folio text-[22px] text-muted">
                p. {reading.current_position} <span className="text-base">de {reading.total_units}</span>
              </p>
            )}
          </div>
          <ProgressBar value={progressFraction(reading)} />
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            {[
              ['Ritmo', pace === null ? '—' : `${Math.round(pace)} ${reading.unit === 'pages' ? 'pág' : '%'}/día`],
              ['Tiempo', minutes > 0 ? formatMinutes(minutes) : '—'],
              ['Te quedan', reading.unit === 'pages' ? `${remaining} págs.` : `${remaining} %`],
              ['Fin estimado', finish ? fmt(finish, 'd MMM') : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 leading-tight">
                  <span className="folio text-[25px]">{value.split(' ')[0]}</span>
                  {value.includes(' ') && <span className="ml-1 text-xs">{value.slice(value.indexOf(' ') + 1)}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <BookTags bookId={reading.book_id} />
      {own && (reading.status === 'reading' || reading.status === 'finished') && <RecommendButton bookId={reading.book_id} />}
      {own && !online && <p className="text-xs text-muted">Sin conexión: puedes registrar sesiones, pero no editar.</p>}
      {own && pending > 0 && (
        <p className="text-xs text-muted">Espera a que se sincronicen las sesiones para editar.</p>
      )}
      <div>
        <div ref={tablist} className="relative flex gap-7 border-b border-rule" role="tablist" aria-label="Detalle del libro">
          {tabs.map((item) => (
            <button
              key={item.value}
              id={`book-tab-${item.value}`}
              role="tab"
              aria-selected={tab === item.value}
              aria-controls="book-panel"
              tabIndex={tab === item.value ? 0 : -1}
              onKeyDown={(event) => {
                const index = tabs.findIndex((candidate) => candidate.value === item.value)
                const next =
                  event.key === 'ArrowRight'
                    ? (index + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (index + tabs.length - 1) % tabs.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : null
                if (next === null) return
                event.preventDefault()
                setTab(tabs[next].value)
                document.getElementById(`book-tab-${tabs[next].value}`)?.focus()
              }}
              className={`min-h-11 min-w-11 text-sm font-bold transition-colors duration-200 ${tab === item.value ? 'text-ink' : 'text-muted'}`}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </button>
          ))}
          {ink && (
            <span
              aria-hidden
              className="absolute -bottom-px left-0 h-0.5 rounded-full bg-ink"
              style={{
                width: ink.width,
                transform: `translateX(${ink.left}px)`,
                transition: 'transform var(--dur-move) var(--ease), width var(--dur-move) var(--ease)',
              }}
            />
          )}
        </div>
        <div
          key={tab}
          id="book-panel"
          role="tabpanel"
          aria-labelledby={`book-tab-${tab}`}
          className="pt-1"
          style={{ animation: 'gb-fade-up 260ms var(--ease) both' }}
        >
          {tab === 'sessions' && (
            <div>
              {sessionsQuery.isPending && (
                <p role="status" className="py-3 text-sm text-muted">
                  Cargando sesiones…
                </p>
              )}
              {sessionsQuery.isError && (
                <div role="alert" className="space-y-2 py-3">
                  <p className="text-sm text-danger">No se pudieron cargar las sesiones.</p>
                  <button className="btn btn-secondary" onClick={() => void sessionsQuery.refetch()}>
                    Reintentar
                  </button>
                </div>
              )}
              {!sessionsQuery.isPending && !sessionsQuery.isError && sessions.length === 0 && (
                <p className="py-3 text-sm text-muted">Todavía no hay sesiones registradas.</p>
              )}
              {(allSessions ? sessions : sessions.slice(0, 10)).map((session) => {
                const dateLabel = fmt(session.read_on, 'd MMM')
                const content = (
                  <>
                    <time dateTime={session.read_on} aria-label={dateLabel} className="w-10 shrink-0 text-center">
                      <span className="folio block text-[28px] leading-none">{fmt(session.read_on, 'd')}</span>
                      <span className="mt-1 block text-xs text-muted">{fmt(session.read_on, 'MMM')}</span>
                    </time>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {timeOnly(session)
                          ? 'Solo tiempo'
                          : `+ ${session.end_pos - session.start_pos} ${reading.unit === 'pages' ? 'págs.' : '%'}`}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {timeOnly(session)
                          ? formatUnitValue(reading.unit, session.start_pos)
                          : reading.unit === 'pages'
                            ? `p. ${session.start_pos} — ${session.end_pos}`
                            : `${session.start_pos} % — ${session.end_pos} %`}
                        {session.place ? ` · ${session.place}` : ''}
                      </p>
                    </div>
                    {session.minutes !== null && (
                      <p className="shrink-0 text-right">
                        <span className="folio text-[25px]">{session.minutes}</span>{' '}
                        <span className="text-xs text-muted">min</span>
                      </p>
                    )}
                  </>
                )
                return own ? (
                  // Every one of your sessions opens its editor; only the last can change pages.
                  <button
                    key={session.id}
                    type="button"
                    className="pressable flex min-h-11 w-full items-center gap-3 border-b border-rule py-3 text-left disabled:opacity-60"
                    aria-label={`Editar la sesión del ${dateLabel}`}
                    disabled={disabled}
                    onClick={() => setEditing(session)}
                  >
                    {content}
                    {reactions.some((r) => r.target_id === session.id && r.user_id !== userId) && (
                      <Heart size={15} className="shrink-0 text-rose" fill="currentColor" aria-label={`Le gusta a ${partner?.display_name ?? 'tu pareja'}`} />
                    )}
                    <Pencil size={15} className="shrink-0 text-muted" aria-hidden />
                  </button>
                ) : (
                  <div key={session.id} className="flex min-h-11 items-center gap-3 border-b border-rule py-3">
                    {content}
                    {(() => {
                      const liked = reactions.some((r) => r.target_id === session.id && r.user_id === userId)
                      return (
                        <button
                          type="button"
                          className={`-mr-2 grid h-11 w-11 flex-none place-items-center rounded-full transition-colors duration-150 ${liked ? 'text-rose' : 'text-muted'}`}
                          aria-pressed={liked}
                          aria-label={`Me gusta la sesión del ${dateLabel}`}
                          onClick={() => void toggleHeart('session', session.id, userId).catch(() => toast('No se pudo guardar el corazón'))}
                        >
                          <Heart size={19} fill={liked ? 'currentColor' : 'none'} aria-hidden />
                        </button>
                      )
                    })()}
                  </div>
                )
              })}
              {!allSessions && sessions.length > 10 && (
                <button className="btn btn-ghost w-full" onClick={() => setAllSessions(true)}>
                  Ver todas ({new Intl.NumberFormat('es').format(sessions.length)})
                </button>
              )}
            </div>
          )}
          {tab === 'quotes' && (
            <div className="space-y-4 pt-3">
              {own && (
                <button type="button" className="btn btn-soft w-full" onClick={() => setQuoting(true)}>
                  <Plus size={17} aria-hidden /> Guardar una cita
                </button>
              )}
              {bookQuotes.length === 0 ? (
                <p className="py-2 text-sm text-muted">Aún no hay citas ni notas en este libro.</p>
              ) : (
                bookQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} showBook={false} />)
              )}
              {own && (
                <QuoteSheet
                  open={quoting}
                  onClose={() => setQuoting(false)}
                  bookId={reading.book_id}
                  page={reading.unit === 'pages' ? reading.current_position : null}
                />
              )}
            </div>
          )}
          {tab === 'joint' && <BookTogether reading={reading} />}
        </div>
      </div>
      {own &&
        reading.status !== 'abandoned' &&
        createPortal(
          <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-xl gap-2 border-t border-rule bg-bg px-[26px] py-3">
            {reading.status === 'finished' ? (
              <button className="btn btn-primary w-full" disabled={disabled} onClick={() => void reread()}>
                Volver a leer
              </button>
            ) : atLastPage(reading) ? (
              <button className="btn btn-primary w-full" disabled={disabled} onClick={() => setFinishing(true)}>
                <BookCheck size={17} aria-hidden />
                Terminar libro
              </button>
            ) : (
              <>
                {timing ? (
                  <Link to={`/leer/${reading.id}`} className="btn btn-primary flex-1">
                    {timer?.pausedAt == null && <span className="live-dot" aria-hidden />}
                    Volver a la sesión
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary flex-1"
                    onClick={() => {
                      if (startTimer(reading)) navigate(`/leer/${reading.id}`)
                    }}
                  >
                    <Play size={16} fill="currentColor" aria-hidden />
                    Leer
                  </button>
                )}
                <Link to={`/leer/${reading.id}?modo=paginas`} className="btn btn-outline flex-1 whitespace-nowrap">
                  <Plus size={17} aria-hidden />
                  {reading.unit === 'percent' ? 'Apuntar porcentaje' : 'Apuntar páginas'}
                </Link>
              </>
            )}
          </div>,
          document.body,
        )}
      {own && (
        <BottomSheet open={statusOpen} onClose={() => setStatusOpen(false)} title="Estado de la lectura">
          <div className="pb-3">
          <Segmented
            variant="underline"
            aria-label="Estado de la lectura"
            options={(Object.keys(statuses) as Reading['status'][]).map((value) => ({ value, label: statuses[value] }))}
            value={reading.status}
            onChange={(status) => {
              setStatusOpen(false)
              if (status === 'abandoned') {
                setAbandoning(true)
                return
              }
              void patch({
                status,
                ...(status === 'reading' && !reading.started_on ? { started_on: today } : {}),
                ...(status === 'finished'
                  ? { current_position: reading.total_units }
                  : reading.status === 'finished'
                    ? { current_position: sessions.reduce((max, session) => Math.max(max, session.end_pos), 0) }
                    : {}),
                finished_on: status === 'finished' ? (reading.finished_on ?? today) : null,
                finished_precision: status === 'finished' ? 'day' : null,
                ...(status === 'reading' || status === 'want' || status === 'finished' ? { backfilled: false } : {}),
              })
            }}
          />
          </div>
        </BottomSheet>
      )}
      {own && (
        <ReadingOptionsSheet
          reading={reading}
          open={menuOpen}
          busy={busy}
          disabled={disabled}
          destructiveDisabled={destructiveDisabled}
          explanation={destructiveExplanation}
          onClose={() => { if (!busy) setMenuOpen(false) }}
          onEdit={() => { setMenuOpen(false); setEditingReading(true) }}
          onDestroy={(remove) => void destroyReading(remove)}
        />
      )}
      {editing && <SessionEditor reading={reading} session={editing} onClose={() => setEditing(null)} />}
      {editingReading && (
        <ReadingEditor reading={reading} disabled={disabled} onSave={patch} onClose={() => setEditingReading(false)} />
      )}
      {finishing && (
        <FinishSheet reading={reading} readOn={finishDay(sessions, reading.id, today)} onClose={() => setFinishing(false)} />
      )}
      {abandoning && <AbandonSheet reading={reading} disabled={disabled} onSave={patch} onClose={() => setAbandoning(false)} />}
    </div>
  )
}

