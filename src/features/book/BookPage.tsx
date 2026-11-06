import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { differenceInCalendarDays } from 'date-fns'
import { useMe } from '@/features/auth/me'
import { qk, useReadings, useSessions } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { Reading, ReadingWithBook, Session } from '@/lib/types'
import { fmt, fromISODate, todayISO } from '@/lib/dates'
import { formatDays, formatMinutes, formatPosition, formatUnitDelta, parseHMM, progressFraction, toHMM } from '@/lib/units'
import { Cover } from '@/components/Cover'
import { ProgressBar } from '@/components/ProgressBar'
import { Stars } from '@/components/Stars'
import { MoodChips } from '@/components/MoodChips'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { LogSessionSheet } from '@/features/session/LogSessionSheet'
import { useOnline } from '@/features/session/useOnline'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'
import { ReactionBar } from '@/features/us/ReactionBar'
import { JointReadingSection } from '@/features/us/JointReadingSection'
import { Notes } from './Notes'

const statuses = { want: 'Quiero leer', reading: 'Leyendo', finished: 'Leído', abandoned: 'Abandonado' }
export function BookPage() {
  const { readingId } = useParams()
  const { userId, partner } = useMe()
  const mine = useReadings(userId)
  const theirs = useReadings(partner?.id)
  const reading = mine.data?.find((r) => r.id === readingId) ?? theirs.data?.find((r) => r.id === readingId)
  return (
    <div className="space-y-5">
      <Link className="btn btn-ghost" to="/biblioteca">
        ← Volver
      </Link>
      {reading ? (
        <BookDetail key={reading.id} reading={reading} />
      ) : mine.isPending || (partner && theirs.isPending) ? (
        <div className="card animate-pulse h-64" aria-label="Cargando libro" />
      ) : (
        <p>No se ha encontrado esta lectura.</p>
      )}
    </div>
  )
}
function BookDetail({ reading }: { reading: ReadingWithBook }) {
  const { userId } = useMe()
  const navigate = useNavigate()
  const own = reading.user_id === userId
  const sessionsQuery = useSessions(reading.user_id)
  const sessions = (sessionsQuery.data ?? []).filter((s) => s.reading_id === reading.id)
  const newest = [...sessions].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const days = new Set(sessions.map((s) => s.read_on)).size
  const delta = sessions.reduce((sum, s) => sum + s.end_pos - s.start_pos, 0)
  const minutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0)
  const duration = reading.started_on
    ? Math.max(
        1,
        differenceInCalendarDays(fromISODate(reading.finished_on ?? todayISO()), fromISODate(reading.started_on)) + 1,
      )
    : null
  const online = useOnline()
  const pending = usePendingSessionCount()
  const [busy, setBusy] = useState(false)
  const [logging, setLogging] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)
  async function patch(values: Partial<Reading>) {
    if (!own || !online || busy) return
    setBusy(true)
    try {
      const { error } = await supabase.from('readings').update(values).eq('id', reading.id).eq('user_id', userId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: qk.readings(userId) })
    } catch {
      toast('No se pudo actualizar la lectura')
    } finally {
      setBusy(false)
    }
  }
  async function reread() {
    if (!own || !online || busy) return
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
          started_on: todayISO(),
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
  const disabled = !online || busy || pending > 0
  return (
    <>
      <header className="flex gap-5">
        <Cover book={reading.book} width={116} />
        <div className="min-w-0 space-y-2">
          <h1>{reading.book.title}</h1>
          <p className="text-muted">{reading.book.authors.join(', ')}</p>
          <p>{reading.format === 'paper' ? 'Papel' : reading.format === 'ebook' ? 'Ebook' : 'Audiolibro'}</p>
        </div>
      </header>
      <section className="card space-y-4">
        <ProgressBar value={progressFraction(reading)} />
        <p>{formatPosition(reading)}</p>
        {own ? (
          <label className="label">
            Estado
            <select
              className="input mt-2"
              value={reading.status}
              disabled={disabled}
              onChange={(e) => {
                const status = e.target.value as Reading['status']
                void patch({
                  status,
                  ...(status === 'reading' && !reading.started_on ? { started_on: todayISO() } : {}),
                  ...(status === 'finished'
                    ? { finished_on: reading.finished_on ?? todayISO() }
                    : { finished_on: null }),
                })
              }}
            >
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>{statuses[reading.status]}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(['started_on', 'finished_on'] as const).map((field) => (
            <label key={field} className="label">
              {field === 'started_on' ? 'Inicio' : 'Fin'}
              {own ? (
                <input
                  className="input mt-2"
                  type="date"
                  max={todayISO()}
                  min={field === 'finished_on' ? (reading.started_on ?? undefined) : undefined}
                  value={reading[field] ?? ''}
                  disabled={disabled}
                  onChange={(e) => {
                    const value = e.target.value || null
                    if (field === 'started_on' && value && reading.finished_on && value > reading.finished_on) {
                      toast('El inicio no puede ser posterior al fin')
                      return
                    }
                    void patch({ [field]: value })
                  }}
                />
              ) : (
                <p className="font-normal">{reading[field] ? fmt(reading[field]!, 'd MMM yyyy') : '—'}</p>
              )}
            </label>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-muted">Duración</dt>
            <dd>{duration === null ? '—' : formatDays(duration)}</dd>
          </div>
          <div>
            <dt className="text-muted">Tiempo registrado</dt>
            <dd>{formatMinutes(minutes)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted">Ritmo medio por día con lectura</dt>
            <dd>{days ? `${formatUnitDelta(reading.unit, Math.round((delta / days) * 10) / 10)} / día` : '—'}</dd>
          </div>
        </dl>
        {own && (reading.status === 'reading' || reading.status === 'want') && (
          <button className="btn btn-primary" onClick={() => setLogging(true)}>
            Registrar
          </button>
        )}
        {own && reading.status === 'finished' && (
          <button className="btn btn-secondary" disabled={disabled} onClick={() => void reread()}>
            Volver a leer
          </button>
        )}
        {own && !online && <p className="text-muted">Sin conexión</p>}
      </section>
      {reading.status === 'finished' && (
        <section className="card space-y-4">
          <h2>Tu valoración</h2>
          <Stars
            value={reading.rating ?? 0}
            onChange={
              own && !disabled
                ? (rating) => {
                    void patch({ rating })
                  }
                : undefined
            }
          />
          <MoodChips
            value={reading.moods}
            onChange={
              own && !disabled
                ? (moods) => {
                    void patch({ moods })
                  }
                : undefined
            }
          />
          <ReactionBar targetType="reading" targetId={reading.id} ownerId={reading.user_id} />
        </section>
      )}
      <JointReadingSection reading={reading} />
      <section className="space-y-3">
        <h2>Sesiones</h2>
        {sessionsQuery.isPending && <p className="text-muted">Cargando sesiones…</p>}
        {sessions.length === 0 && <p className="text-muted">Todavía no hay sesiones registradas.</p>}
        {sessions.map((session) => (
          <article className="card space-y-2" key={session.id}>
            <p>{fmt(session.read_on, "d 'de' MMMM yyyy")}</p>
            <p>
              +{formatUnitDelta(reading.unit, session.end_pos - session.start_pos)}
              {session.minutes ? ` · ${formatMinutes(session.minutes)}` : ''}
            </p>
            <ReactionBar targetType="session" targetId={session.id} ownerId={reading.user_id} />
            {own && newest?.id === session.id && (
              <button className="btn btn-ghost" disabled={disabled} onClick={() => setEditing(session)}>
                Editar o borrar
              </button>
            )}
          </article>
        ))}
      </section>
      {own && <Notes readingId={reading.id} />}
      <LogSessionSheet open={logging} onClose={() => setLogging(false)} reading={reading} />
      {editing && <SessionEditor reading={reading} session={editing} onClose={() => setEditing(null)} />}
    </>
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
  const online = useOnline()
  async function save(remove: boolean) {
    if (!online || busy) return
    const endPos = reading.unit === 'minutes' ? parseHMM(end) : /^\d+$/.test(end) ? Number(end) : null
    if (
      !remove &&
      (endPos === null ||
        endPos <= session.start_pos ||
        endPos > reading.total_units ||
        !date ||
        date > todayISO() ||
        (minutes !== '' && (!/^\d+$/.test(minutes) || Number(minutes) <= 0)))
    ) {
      toast('Revisa el avance, la fecha y los minutos')
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
    <BottomSheet open onClose={onClose} title="Editar última sesión">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save(false)
        }}
      >
        <label className="label">
          He llegado a …<input className="input mt-2" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </label>
        <label className="label">
          Fecha
          <input
            className="input mt-2"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="label">
          Minutos (opcional)
          <input
            className="input mt-2"
            type="number"
            min="1"
            step="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
        {!online && <p className="text-muted">Sin conexión</p>}
        <button className="btn btn-primary w-full" disabled={!online || busy}>
          Guardar cambios
        </button>
        <button
          type="button"
          className="btn btn-ghost text-danger w-full"
          disabled={!online || busy}
          onClick={() => void save(true)}
        >
          Borrar sesión
        </button>
      </form>
    </BottomSheet>
  )
}
