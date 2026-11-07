import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router'
import { differenceInCalendarDays } from 'date-fns'
import { ArrowLeft, MoreHorizontal, Pencil, Play, Plus } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { qk, useMessages, useNotes, useReadings, useSessions, useTogether } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { Reading, ReadingWithBook, Session } from '@/lib/types'
import { fmt, fromISODate, todayISO } from '@/lib/dates'
import { formatDays, formatMinutes, formatUnitValue, parseHMM, progressFraction, toHMM } from '@/lib/units'
import { estimatedFinish, pacePerDay } from '@/lib/stats/insights'
import { Avatar } from '@/components/Avatar'
import { Cover } from '@/components/Cover'
import { ProgressBar } from '@/components/ProgressBar'
import { Segmented } from '@/components/Segmented'
import { Stars } from '@/components/Stars'
import { MoodChips } from '@/components/MoodChips'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { startTimer, useActiveTimer } from '@/features/session/Timer'
import { useOnline } from '@/features/session/useOnline'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'
import { DualProgressBar } from '@/components/DualProgressBar'
import { MessageCard } from '@/features/us/MessageCard'
import { TraceSheet } from '@/features/us/TraceSheet'
import { useRooms } from '@/features/us/rooms'
import { addTogether } from '@/features/us/together'
import { isReadingNow } from '@/features/us/CoupleProgress'
import { Notes } from './Notes'

const statuses = { want: 'Pendiente', reading: 'Leyendo', finished: 'Leído', abandoned: 'Dejado' }
type BookTab = 'sessions' | 'notes' | 'joint'

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
  const notesQuery = useNotes(reading.id)
  const sessions = (sessionsQuery.data ?? [])
    .filter((s) => s.reading_id === reading.id)
    .sort((a, b) => b.read_on.localeCompare(a.read_on) || b.created_at.localeCompare(a.created_at))
  const newest = sessions.reduce<Session | undefined>(
    (latest, session) => (!latest || session.created_at > latest.created_at ? session : latest),
    undefined,
  )
  const minutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0)
  const today = todayISO()
  const pace = pacePerDay(reading, sessions, today)
  const finish = estimatedFinish(reading, sessions, today)
  const remaining = Math.max(0, reading.total_units - reading.current_position)
  const online = useOnline()
  const pending = usePendingSessionCount()
  const timer = useActiveTimer()
  const timing = timer?.readingId === reading.id
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)
  const [editingReading, setEditingReading] = useState(false)
  const [editingMoods, setEditingMoods] = useState(false)
  const [tab, setTab] = useState<BookTab>('sessions')
  const [allSessions, setAllSessions] = useState(false)
  const disabled = !online || busy || pending > 0
  const tabs: { value: BookTab; label: string }[] = [
    { value: 'sessions', label: 'Sesiones' },
    ...(own
      ? [
          {
            value: 'notes' as const,
            label: `Notas · ${notesQuery.data?.filter((n) => n.user_id === userId).length ?? 0}`,
          },
        ]
      : []),
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
        <p className="ml-auto text-right text-xs text-muted">
          {reading.format === 'paper'
            ? `Papel · ${reading.total_units} págs.`
            : `Audiolibro · ${formatMinutes(reading.total_units)}`}
        </p>
        {own && (
          <button
            className="icon-btn"
            aria-label="Editar lectura"
            disabled={disabled}
            onClick={() => setEditingReading(true)}
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
            {reading.finished_on && reading.status === 'finished'
              ? `Terminado el ${fmt(reading.finished_on, 'd MMM')}`
              : reading.started_on
                ? `Empezado el ${fmt(reading.started_on, 'd MMM')}`
                : 'Aún por empezar'}
          </p>
        </div>
      </header>
      {own ? (
        <fieldset disabled={disabled}>
          <Segmented
            variant="underline"
            aria-label="Estado de la lectura"
            options={(Object.keys(statuses) as Reading['status'][]).map((value) => ({ value, label: statuses[value] }))}
            value={reading.status}
            onChange={(status) =>
              void patch({
                status,
                ...(status === 'reading' && !reading.started_on ? { started_on: today } : {}),
                ...(status === 'finished' ? { current_position: reading.total_units } : {}),
                finished_on: status === 'finished' ? (reading.finished_on ?? today) : null,
              })
            }
          />
        </fieldset>
      ) : (
        <p className="text-sm text-muted">{statuses[reading.status]}</p>
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
                  onChange={editingMoods && own && !disabled ? (moods) => void patch({ moods }) : undefined}
                />
              </div>
              {own && (
                <button
                  type="button"
                  className="min-h-11 shrink-0 text-xs text-accent"
                  disabled={disabled}
                  aria-expanded={editingMoods}
                  onClick={() => setEditingMoods(!editingMoods)}
                >
                  {editingMoods ? 'Listo' : 'Editar ánimos'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {reading.status === 'finished' ? (
        // The finish date is already in the header; summarize how long it took.
        (reading.started_on && reading.finished_on) || minutes > 0 ? (
          <section className="rule pt-4 text-sm text-muted" aria-label="Resumen de lectura">
            {[
              reading.started_on && reading.finished_on
                ? `Leído en ${formatDays(differenceInCalendarDays(fromISODate(reading.finished_on), fromISODate(reading.started_on)) + 1)}`
                : null,
              minutes > 0 ? `${formatMinutes(minutes)} de lectura` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </section>
        ) : null
      ) : (
        <section className="space-y-4" aria-label="Progreso de lectura">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="folio text-[38px] leading-none text-accent">
              {Math.round(progressFraction(reading) * 100)} <span className="text-2xl">%</span>
            </p>
            <p className="folio text-[22px] text-muted">
              {reading.unit === 'pages'
                ? `p. ${reading.current_position} — ${reading.total_units}`
                : `${formatUnitValue(reading.unit, reading.current_position)} — ${formatUnitValue(reading.unit, reading.total_units)}`}
            </p>
          </div>
          <ProgressBar value={progressFraction(reading)} />
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            {[
              ['Ritmo', pace === null ? '—' : `${Math.round(pace)} ${reading.unit === 'pages' ? 'pág' : 'min'}/día`],
              ['Tiempo', minutes > 0 ? formatMinutes(minutes) : '—'],
              ['Te quedan', reading.unit === 'pages' ? `${remaining} págs.` : formatMinutes(remaining)],
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
      {own && !online && <p className="text-xs text-muted">Sin conexión: puedes registrar sesiones, pero no editar.</p>}
      {own && pending > 0 && (
        <p className="text-xs text-muted">Espera a que se sincronicen las sesiones para editar.</p>
      )}
      <div>
        <div className="relative flex gap-7 border-b border-rule" role="tablist" aria-label="Detalle del libro">
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
              className={`min-h-11 border-b text-sm ${tab === item.value ? 'border-ink text-ink' : 'border-transparent text-muted'}`}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div key={tab} id="book-panel" role="tabpanel" aria-labelledby={`book-tab-${tab}`} className="pt-1">
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
                const editable = own && session.id === newest?.id
                const content = (
                  <>
                    <time dateTime={session.read_on} aria-label={dateLabel} className="w-10 shrink-0 text-center">
                      <span className="folio block text-[28px] leading-none">{fmt(session.read_on, 'd')}</span>
                      <span className="mt-1 block text-xs text-muted">{fmt(session.read_on, 'MMM')}</span>
                    </time>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        + {session.end_pos - session.start_pos} {reading.unit === 'pages' ? 'págs.' : 'min'}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {reading.unit === 'pages'
                          ? `p. ${session.start_pos} — ${session.end_pos}`
                          : `${formatMinutes(session.start_pos)} — ${formatMinutes(session.end_pos)}`}
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
                return (
                  <div key={session.id} className="flex items-center gap-1 border-b border-rule py-3">
                    <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3">{content}</div>
                    {editable && (
                      <button
                        className="icon-btn h-11 w-11 shrink-0"
                        aria-label="Editar la última sesión"
                        disabled={disabled}
                        onClick={() => setEditing(session)}
                      >
                        <Pencil size={18} aria-hidden="true" />
                      </button>
                    )}
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
          {tab === 'notes' && own && <Notes readingId={reading.id} />}
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
                    {reading.format === 'audio' ? 'Escuchar' : 'Leer'}
                  </button>
                )}
                <Link to={`/leer/${reading.id}?modo=paginas`} className="btn btn-outline flex-1 whitespace-nowrap">
                  <Plus size={17} aria-hidden />
                  {reading.unit === 'minutes' ? 'Apuntar tiempo' : 'Apuntar páginas'}
                </Link>
              </>
            )}
          </div>,
          document.body,
        )}
      {editing && <SessionEditor reading={reading} session={editing} onClose={() => setEditing(null)} />}
      {editingReading && (
        <ReadingEditor reading={reading} disabled={disabled} onSave={patch} onClose={() => setEditingReading(false)} />
      )}
    </div>
  )
}

/** Says whose reading this is and links it to mine: the bridge between both diaries. */
function PartnerReadingBanner({ reading }: { reading: ReadingWithBook }) {
  const { userId, partner } = useMe()
  const myReadings = useReadings(userId)
  const together = useTogether()
  const [tracing, setTracing] = useState(false)
  const [adding, setAdding] = useState(false)
  if (!partner) return null
  const mine = myReadings.data
    ?.filter((item) => item.book_id === reading.book_id)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  const listed = together.data?.some((item) => item.book_id === reading.book_id)
  const live = isReadingNow(partner) && partner.reading_now_id === reading.id
  const color = `var(--${partner.accent})`
  return (
    <section className="enter rule space-y-2 pt-3" aria-label={`Lectura de ${partner.display_name}`}>
      <p className="flex items-center gap-2 text-sm">
        <Avatar person={partner} size={26} />
        <span>
          La lectura de <span style={{ color }}>{partner.display_name}</span>
        </span>
        {live && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
            <span className="live-dot" style={{ color }} aria-hidden />
            leyendo ahora
          </span>
        )}
      </p>
      {mine ? (
        <div className="flex flex-wrap items-center gap-x-4">
          <Link to={`/libro/${mine.id}`} className="btn btn-link px-0 text-sm">
            Tu lectura: {formatUnitValue(mine.unit, mine.current_position)} · {Math.round(progressFraction(mine) * 100)}{' '}
            %
          </Link>
          {['want', 'reading'].includes(mine.status) && (
            <button type="button" className="btn btn-link px-0 text-sm" onClick={() => setTracing(true)}>
              Dejarle algo aquí
            </button>
          )}
        </div>
      ) : listed ? (
        <p className="text-xs text-muted">Está en lo que queréis leer juntos.</p>
      ) : (
        <button
          type="button"
          className="btn btn-link px-0 text-sm"
          disabled={adding}
          onClick={() => {
            setAdding(true)
            void addTogether(reading.book_id)
              .then(() => toast('Añadido a lo que queréis leer juntos'))
              .catch(() => toast('No se pudo añadir el libro'))
              .finally(() => setAdding(false))
          }}
        >
          Queremos leerlo juntos
        </button>
      )}
      {mine && <TraceSheet open={tracing} onClose={() => setTracing(false)} reading={mine} />}
    </section>
  )
}

function BookTogether({ reading }: { reading: ReadingWithBook }) {
  const { userId, profile, partner } = useMe()
  const room = useRooms().find((item) => item.book.id === reading.book_id)
  const messages = useMessages()
  const together = useTogether()
  const myReadings = useReadings(userId)
  const ownReading =
    reading.user_id === userId ? reading : myReadings.data?.find((item) => item.book_id === reading.book_id)
  const [traceOpen, setTraceOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reason, setReason] = useState('')
  const listed = together.data?.some((item) => item.book_id === reading.book_id)
  const recent = (messages.data ?? [])
    .filter((message) => message.book_id === reading.book_id && message.kind !== 'reply')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-2)

  async function add() {
    setAdding(true)
    try {
      await addTogether(reading.book_id)
      setReasonOpen(true)
      toast('Añadido a lo que queréis leer juntos')
    } catch {
      toast('No se pudo añadir el libro')
    } finally {
      setAdding(false)
    }
  }
  async function saveReason() {
    if (!reason.trim() || adding) return
    setAdding(true)
    try {
      const { error } = await supabase
        .from('together_items')
        .update({ reason: reason.trim() })
        .eq('book_id', reading.book_id)
        .eq('added_by', userId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: qk.together() })
      setReasonOpen(false)
    } catch {
      toast('No se pudo guardar el motivo')
    } finally {
      setAdding(false)
    }
  }
  return (
    <section className="space-y-3 py-2">
      {room ? (
        <>
          <DualProgressBar
            a={{
              value: progressFraction(room.mine),
              accent: profile.accent,
              label: 'Tú',
              caption: formatUnitValue(room.mine.unit, room.mine.current_position),
            }}
            b={{
              value: progressFraction(room.theirs),
              accent: partner?.accent ?? 'blue',
              label: partner?.display_name ?? 'Tu pareja',
              caption: formatUnitValue(room.theirs.unit, room.theirs.current_position),
            }}
          />
          <Link className="btn btn-outline w-full" to={`/sala/${reading.book_id}`}>
            Abrir la sala
          </Link>
          {recent.map((message) => (
            <MessageCard key={message.id} message={message} variant="bubble" showBook={false} />
          ))}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Un libro para encontraros, cuando a los dos os apetezca.</p>
          {listed ? (
            <Link className="btn btn-soft w-full" to="/nosotros">
              En «Queremos leer juntos»
            </Link>
          ) : (
            <button className="btn btn-outline w-full" disabled={adding || !partner} onClick={() => void add()}>
              {adding ? 'Añadiendo…' : 'Leerlo juntos'}
            </button>
          )}
          {reasonOpen && (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                void saveReason()
              }}
            >
              <label className="lbl">
                ¿Por qué te apetece? (opcional)
                <input
                  className="input mt-2"
                  name="reason"
                  autoComplete="off"
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button className="btn btn-soft" disabled={adding || !reason.trim()}>
                  Dejar el motivo
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setReasonOpen(false)}>
                  Ahora no
                </button>
              </div>
            </form>
          )}
          <button className="btn btn-soft w-full" disabled={!partner} onClick={() => setTraceOpen(true)}>
            Dejarle algo sobre este libro
          </button>
        </>
      )}
      <TraceSheet open={traceOpen} onClose={() => setTraceOpen(false)} reading={ownReading ?? reading} />
    </section>
  )
}

function ReadingEditor({
  reading,
  disabled,
  onSave,
  onClose,
}: {
  reading: ReadingWithBook
  disabled: boolean
  onSave: (values: Partial<Reading>) => Promise<boolean>
  onClose: () => void
}) {
  const [start, setStart] = useState(reading.started_on ?? '')
  const [finish, setFinish] = useState(reading.finished_on ?? '')
  const [total, setTotal] = useState(
    reading.unit === 'minutes' ? toHMM(reading.total_units) : String(reading.total_units),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Editar lectura"
      dirty={
        start !== (reading.started_on ?? '') ||
        finish !== (reading.finished_on ?? '') ||
        total !== (reading.unit === 'minutes' ? toHMM(reading.total_units) : String(reading.total_units))
      }
    >
      <form
        noValidate
        autoComplete="off"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const units = reading.unit === 'minutes' ? parseHMM(total) : /^\d+$/.test(total) ? Number(total) : null
          const next: Record<string, string> = {}
          if (start && start > todayISO()) next.start = 'El inicio no puede ser una fecha futura.'
          if ((finish && finish > todayISO()) || (start && finish && start > finish)) {
            next.finish = 'El fin debe estar entre el inicio y hoy.'
          }
          if (units === null || !Number.isSafeInteger(units) || units <= 0 || units < reading.current_position) {
            next.total = `Indica un total válido, igual o mayor que ${formatUnitValue(reading.unit, reading.current_position)}.`
          }
          setErrors(next)
          const first = Object.keys(next)[0]
          if (first) {
            event.currentTarget.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
            return
          }
          void onSave({ started_on: start || null, finished_on: finish || null, total_units: units! }).then((saved) => {
            if (saved) onClose()
          })
        }}
      >
        <fieldset disabled={disabled} className="space-y-4">
          <label className="label">
            Inicio
            <input
              className="input mt-2"
              name="start"
              aria-invalid={!!errors.start}
              aria-describedby={errors.start ? 'reading-start-error' : undefined}
              type="date"
              max={todayISO()}
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
            {errors.start && (
              <span id="reading-start-error" role="alert" className="mt-2 block text-sm text-danger">
                {errors.start}
              </span>
            )}
          </label>
          <label className="label">
            Fin
            <input
              className="input mt-2"
              name="finish"
              aria-invalid={!!errors.finish}
              aria-describedby={errors.finish ? 'reading-finish-error' : undefined}
              type="date"
              min={start || undefined}
              max={todayISO()}
              value={finish}
              onChange={(event) => setFinish(event.target.value)}
            />
            {errors.finish && (
              <span id="reading-finish-error" role="alert" className="mt-2 block text-sm text-danger">
                {errors.finish}
              </span>
            )}
          </label>
          <label className="label">
            {reading.unit === 'pages' ? 'Total de páginas' : 'Duración total (h:mm)'}
            <input
              className="input mt-2"
              name="total"
              aria-invalid={!!errors.total}
              aria-describedby={errors.total ? 'reading-total-error' : undefined}
              placeholder={reading.unit === 'minutes' ? 'p. ej. 9:30…' : 'p. ej. 320…'}
              inputMode={reading.unit === 'pages' ? 'numeric' : 'text'}
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              required
            />
            {errors.total && (
              <span id="reading-total-error" role="alert" className="mt-2 block text-sm text-danger">
                {errors.total}
              </span>
            )}
          </label>
          <button className="btn btn-primary w-full">Guardar cambios</button>
        </fieldset>
      </form>
    </BottomSheet>
  )
}
function SessionEditor({
  reading,
  session,
  onClose,
}: {
  reading: ReadingWithBook
  session: Session
  onClose: () => void
}) {
  const [end, setEnd] = useState(reading.unit === 'minutes' ? toHMM(session.end_pos) : String(session.end_pos))
  const [date, setDate] = useState(session.read_on)
  const [minutes, setMinutes] = useState(session.minutes === null ? '' : String(session.minutes))
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const online = useOnline()
  const { userId } = useMe()
  const pending = usePendingSessionCount()
  const sessions = useSessions(reading.user_id)
  const newest = sessions.data
    ?.filter((item) => item.reading_id === reading.id)
    .reduce<Session | undefined>(
      (latest, item) => (!latest || item.created_at > latest.created_at ? item : latest),
      undefined,
    )
  const disabled = !online || busy || pending > 0 || reading.user_id !== userId || newest?.id !== session.id
  async function save(remove: boolean) {
    if (disabled) return
    const endPos = reading.unit === 'minutes' ? parseHMM(end) : /^\d+$/.test(end) ? Number(end) : null
    const next: Record<string, string> = {}
    if (!remove) {
      if (
        endPos === null ||
        !Number.isSafeInteger(endPos) ||
        endPos <= session.start_pos ||
        endPos > reading.total_units
      ) {
        next.end = `Indica una posición mayor que ${formatUnitValue(reading.unit, session.start_pos)} y no superior a ${formatUnitValue(reading.unit, reading.total_units)}.`
      }
      if (!date || date > todayISO()) next.date = 'Elige una fecha no posterior a hoy.'
      if (
        minutes !== '' &&
        (!/^\d+$/.test(minutes) || !Number.isSafeInteger(Number(minutes)) || Number(minutes) <= 0)
      ) {
        next.minutes = 'Indica un número entero de minutos mayor que cero.'
      }
    }
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      document.getElementById(`session-${first}`)?.focus()
      return
    }
    if (remove && !window.confirm('¿Borrar la última sesión y restaurar la posición anterior?')) return
    setBusy(true)
    const position = remove ? session.start_pos : endPos!
    try {
      const { error: readingError } = await supabase
        .from('readings')
        .update({ current_position: position })
        .eq('id', reading.id)
        .eq('user_id', reading.user_id)
      if (readingError) throw readingError
      const result = remove
        ? await supabase.from('sessions').delete().eq('id', session.id).eq('user_id', reading.user_id)
        : await supabase
            .from('sessions')
            .update({ end_pos: endPos, read_on: date, minutes: minutes ? Number(minutes) : null })
            .eq('id', session.id)
            .eq('user_id', reading.user_id)
      if (result.error) {
        await supabase
          .from('readings')
          .update({ current_position: reading.current_position })
          .eq('id', reading.id)
          .eq('user_id', reading.user_id)
        throw result.error
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.readings(reading.user_id) }),
        queryClient.invalidateQueries({ queryKey: qk.sessions(reading.user_id) }),
      ])
      onClose()
    } catch {
      toast('No se pudo actualizar la sesión')
    } finally {
      setBusy(false)
    }
  }
  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Editar última sesión"
      dirty={
        end !== (reading.unit === 'minutes' ? toHMM(session.end_pos) : String(session.end_pos)) ||
        date !== session.read_on ||
        minutes !== (session.minutes === null ? '' : String(session.minutes))
      }
    >
      <form
        noValidate
        autoComplete="off"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save(false)
        }}
      >
        <label className="label">
          He llegado a…
          <input
            id="session-end"
            name="end"
            className="input mt-2"
            inputMode={reading.unit === 'minutes' ? 'text' : 'numeric'}
            placeholder={reading.unit === 'minutes' ? 'p. ej. 9:30…' : 'p. ej. 72…'}
            value={end}
            aria-invalid={!!errors.end}
            aria-describedby={errors.end ? 'session-end-error' : undefined}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
          {errors.end && (
            <span id="session-end-error" role="alert" className="mt-2 block text-sm text-danger">
              {errors.end}
            </span>
          )}
        </label>
        <label className="label">
          Fecha
          <input
            className="input mt-2"
            id="session-date"
            name="date"
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? 'session-date-error' : undefined}
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          {errors.date && (
            <span id="session-date-error" role="alert" className="mt-2 block text-sm text-danger">
              {errors.date}
            </span>
          )}
        </label>
        <label className="label">
          Minutos (opcional)
          <input
            className="input mt-2"
            id="session-minutes"
            name="minutes"
            aria-invalid={!!errors.minutes}
            aria-describedby={errors.minutes ? 'session-minutes-error' : undefined}
            type="number"
            min="1"
            step="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          {errors.minutes && (
            <span id="session-minutes-error" role="alert" className="mt-2 block text-sm text-danger">
              {errors.minutes}
            </span>
          )}
        </label>
        {!online && <p className="text-muted">Sin conexión</p>}
        <button className="btn btn-primary w-full" disabled={disabled}>
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          className="btn btn-ghost text-danger w-full"
          disabled={disabled}
          onClick={() => void save(true)}
        >
          Borrar sesión
        </button>
      </form>
    </BottomSheet>
  )
}
