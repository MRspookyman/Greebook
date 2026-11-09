import { useState } from 'react'
import { useMe } from '@/features/auth/me'
import { qk, useSessions } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { Reading, ReadingWithBook, Session } from '@/lib/types'
import { fmt, todayISO } from '@/lib/dates'
import { formatUnitValue } from '@/lib/units'
import { TIME_ONLY_MINUTES, timeOnly, validSessionProgress } from '@/lib/sessionRules'
import { removeWithUndo } from '@/lib/undo'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { useOnline } from '@/features/session/useOnline'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'

type ReadingState = Pick<Reading, 'current_position' | 'status' | 'finished_on' | 'finished_precision' | 'backfilled'>

/** Where the reading stands once its last session moves to `position` (finished books reopen if needed). */
function readingAt(reading: ReadingWithBook, position: number): Partial<ReadingState> {
  return {
    current_position: position,
    ...(reading.status === 'finished' && position < reading.total_units
      ? { status: 'reading' as const, finished_on: null, finished_precision: null, backfilled: false }
      : {}),
  }
}

async function updateReading(reading: ReadingWithBook, values: Partial<ReadingState>) {
  const { error } = await supabase.from('readings').update(values).eq('id', reading.id).eq('user_id', reading.user_id)
  if (error) throw error
}

const restore = (reading: ReadingWithBook): ReadingState => ({
  current_position: reading.current_position,
  status: reading.status,
  finished_on: reading.finished_on,
  finished_precision: reading.finished_precision,
  backfilled: reading.backfilled,
})

/**
 * Any session can change its day and minutes. Only the last one can change where it ended, or be deleted:
 * every later session starts where the previous one ended.
 */
export function SessionEditor({
  reading,
  session,
  onClose,
}: {
  reading: ReadingWithBook
  session: Session
  onClose: () => void
}) {
  const [end, setEnd] = useState(String(session.end_pos))
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
  const last = newest?.id === session.id
  const disabled = !online || busy || pending > 0 || reading.user_id !== userId

  function remove() {
    if (disabled || !last) return
    const key = qk.readings(reading.user_id)
    const before = queryClient.getQueryData<ReadingWithBook[]>(key)
    removeWithUndo({
      ids: [session.id],
      message: 'Sesión borrada',
      failMessage: 'No se pudo borrar la sesión',
      // The reading goes back to where this session started while it can still be undone.
      apply: () =>
        queryClient.setQueryData<ReadingWithBook[]>(key, (old) =>
          old?.map((item) => (item.id === reading.id ? { ...item, ...readingAt(reading, session.start_pos) } : item)),
        ),
      revert: () => queryClient.setQueryData(key, before),
      commit: async () => {
        await updateReading(reading, readingAt(reading, session.start_pos))
        const { error } = await supabase.from('sessions').delete().eq('id', session.id).eq('user_id', reading.user_id)
        if (error) {
          await updateReading(reading, restore(reading))
          throw error
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: key }),
          queryClient.invalidateQueries({ queryKey: qk.sessions(reading.user_id) }),
        ])
      },
    })
    onClose()
  }

  async function save() {
    if (disabled) return
    const endPos = last ? (/^\d+$/.test(end) ? Number(end) : null) : session.end_pos
    const minutesValue = minutes === '' ? null : /^\d+$/.test(minutes) ? Number(minutes) : NaN
    const next: Record<string, string> = {}
    if (endPos === null || !Number.isSafeInteger(endPos) || endPos < session.start_pos || endPos > reading.total_units) {
      next.end = `Indica una posición entre ${formatUnitValue(reading.unit, session.start_pos)} y ${formatUnitValue(reading.unit, reading.total_units)}.`
    }
    if (!date || date > todayISO()) next.date = 'Elige una fecha no posterior a hoy.'
    if (minutesValue !== null && (!Number.isSafeInteger(minutesValue) || minutesValue <= 0)) {
      next.minutes = 'Indica un número entero de minutos mayor que cero.'
    } else if (endPos !== null && !next.end && !validSessionProgress(session.start_pos, endPos, minutesValue)) {
      next.minutes = `Sin páginas nuevas, la sesión necesita al menos ${TIME_ONLY_MINUTES} minutos.`
    }
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      document.getElementById(`session-${first}`)?.focus()
      return
    }
    setBusy(true)
    try {
      const moved = last && endPos !== session.end_pos
      if (moved) await updateReading(reading, readingAt(reading, endPos!))
      const result = await supabase
        .from('sessions')
        .update({ end_pos: endPos, read_on: date, minutes: minutesValue })
        .eq('id', session.id)
        .eq('user_id', reading.user_id)
      if (result.error) {
        if (moved) await updateReading(reading, restore(reading))
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
      title={`Sesión del ${fmt(session.read_on, "d 'de' MMMM")}`}
      dirty={
        end !== String(session.end_pos) ||
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
          void save()
        }}
      >
        {last ? (
          <label className="label">
            {reading.unit === 'percent' ? 'He llegado al … %' : 'He llegado a…'}
            <input
              id="session-end"
              name="end"
              className="input mt-2"
              inputMode="numeric"
              type="number"
              min={session.start_pos}
              max={reading.total_units}
              step={1}
              placeholder={reading.unit === 'percent' ? 'p. ej. 45…' : 'p. ej. 72…'}
              value={end}
              aria-invalid={!!errors.end}
              aria-describedby={errors.end ? 'session-end-error' : 'session-end-hint'}
              onChange={(e) => setEnd(e.target.value)}
              required
            />
            <span id="session-end-hint" className="mt-2 block text-xs font-normal text-muted">
              Empezaste en {formatUnitValue(reading.unit, session.start_pos)}. Si no avanzaste, deja la misma y apunta
              los minutos.
            </span>
            {errors.end && (
              <span id="session-end-error" role="alert" className="mt-2 block text-sm text-danger">
                {errors.end}
              </span>
            )}
          </label>
        ) : (
          <p className="text-sm text-muted">
            {timeOnly(session)
              ? `Solo tiempo, en ${formatUnitValue(reading.unit, session.start_pos)}.`
              : `De ${formatUnitValue(reading.unit, session.start_pos)} a ${formatUnitValue(reading.unit, session.end_pos)}.`}{' '}
            Las páginas solo se cambian en la última sesión, para no descuadrar las siguientes.
          </p>
        )}
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
          Minutos{timeOnly({ start_pos: session.start_pos, end_pos: last && /^\d+$/.test(end) ? Number(end) : session.end_pos }) ? '' : ' (opcional)'}
          <input
            className="input mt-2"
            id="session-minutes"
            name="minutes"
            inputMode="numeric"
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
        {last && (
          <button type="button" className="btn btn-ghost w-full text-danger" disabled={disabled} onClick={remove}>
            Borrar sesión
          </button>
        )}
      </form>
    </BottomSheet>
  )
}
